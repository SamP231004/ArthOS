package com.arthos.category;

import com.arthos.common.ApiException;
import com.arthos.expense.ExpenseCategory;
import com.arthos.income.IncomeType;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Expense categories and income types per user: the built-ins (renamable, hideable) plus the user's own. Keys are
 * stable — renaming only changes the label. A user's own key is made from its first name ("Pets" → PETS), so older app
 * versions that only know the built-ins still show a readable name.
 */
@Service
public class CategoryService {

    public record View(String key, String label, String emoji, boolean builtIn, boolean hidden) {}

    public static final String OTHER = "OTHER";

    private static final Map<String, String> EXPENSE_EMOJI = Map.ofEntries(
            Map.entry("FOOD", "🍽️"), Map.entry("GROCERIES", "🛒"), Map.entry("TRANSPORT", "🚕"), Map.entry("RENT", "🏠"),
            Map.entry("UTILITIES", "💡"), Map.entry("SHOPPING", "🛍️"), Map.entry("ENTERTAINMENT", "🎬"), Map.entry("HEALTH", "💊"),
            Map.entry("EDUCATION", "🎓"), Map.entry("SUBSCRIPTIONS", "🔁"), Map.entry("EMI", "🏦"), Map.entry("TRAVEL", "✈️"),
            Map.entry("PERSONAL_CARE", "💇"), Map.entry("GIFTS", "🎁"), Map.entry("OTHER", "📦"));
    private static final Map<String, String> INCOME_EMOJI = Map.of(
            "SALARY", "💼", "FREELANCE", "🧑‍💻", "BONUS", "🎉", "INTEREST", "🏦", "DIVIDEND", "📈", "CASH", "💵", "REFUND", "↩️", "OTHER", "📦");

    private final UserRepository users;
    private final MongoTemplate mongo;

    public CategoryService(UserRepository users, MongoTemplate mongo) {
        this.users = users;
        this.mongo = mongo;
    }

    // ------------------------------------------------------------------ reading

    public static List<String> builtIns(CategoryKind kind) {
        return kind == CategoryKind.EXPENSE
                ? Arrays.stream(ExpenseCategory.values()).map(Enum::name).toList()
                : Arrays.stream(IncomeType.values()).map(Enum::name).toList();
    }

    /** Built-ins in their usual order (with the user's names), then the user's own, in the order they were added. */
    public List<View> list(User u, CategoryKind kind) {
        List<CategoryPrefs.Entry> entries = prefs(u).of(kind);
        Map<String, CategoryPrefs.Entry> byKey = new HashMap<>();
        entries.forEach(e -> byKey.put(e.getKey(), e));
        Map<String, String> emoji = kind == CategoryKind.EXPENSE ? EXPENSE_EMOJI : INCOME_EMOJI;
        List<View> out = new ArrayList<>();
        for (String key : builtIns(kind)) {
            CategoryPrefs.Entry e = byKey.get(key);
            out.add(new View(key, e != null && e.getLabel() != null ? e.getLabel() : builtInLabel(key),
                    e != null && e.getEmoji() != null ? e.getEmoji() : emoji.get(key), true, e != null && e.isHidden()));
        }
        for (CategoryPrefs.Entry e : entries)
            if (e.isCustom()) out.add(new View(e.getKey(), e.getLabel(), e.getEmoji(), false, e.isHidden()));
        return out;
    }

    /** Every key the user has renamed or added, to its label — for sentences like "Pets is up 30%". */
    public Map<String, String> labels(User u) {
        Map<String, String> out = new LinkedHashMap<>();
        for (CategoryKind k : CategoryKind.values())
            for (CategoryPrefs.Entry e : prefs(u).of(k))
                if (e.getLabel() != null) out.put(e.getKey(), e.getLabel());
        return out;
    }

    /** Throws 400 unless `key` is a built-in or one of the user's own categories of this kind. Hidden ones still count. */
    public void requireValid(String userId, CategoryKind kind, String key) {
        if (key == null || builtIns(kind).contains(key)) return;
        User u = load(userId);
        boolean own = prefs(u).of(kind).stream().anyMatch(e -> e.isCustom() && e.getKey().equals(key));
        if (!own) throw ApiException.badRequest("Unknown " + (kind == CategoryKind.EXPENSE ? "category" : "income type") + ": " + key);
    }

    public long usage(String userId, CategoryKind kind, String key) {
        return kind == CategoryKind.EXPENSE
                ? mongo.count(Query.query(Criteria.where("userId").is(userId).and("category").is(key)), "expenses")
                : mongo.count(Query.query(Criteria.where("userId").is(userId).and("type").is(key)), "incomes");
    }

    // ------------------------------------------------------------------ changing

    public View create(String userId, CategoryKind kind, String label, String emoji) {
        User u = load(userId);
        String name = clean(label);
        List<CategoryPrefs.Entry> entries = prefs(u).of(kind);
        if (list(u, kind).stream().anyMatch(v -> v.label().equalsIgnoreCase(name)))
            throw ApiException.badRequest("You already have a category called " + name);
        if (entries.stream().filter(CategoryPrefs.Entry::isCustom).count() >= 40) throw ApiException.badRequest("That's the limit of 40 of your own categories");
        String key = uniqueKey(u, kind, name);
        entries.add(new CategoryPrefs.Entry(key, name, blank(emoji), false, true));
        users.save(u);
        return new View(key, name, blank(emoji), false, false);
    }

    public View update(String userId, CategoryKind kind, String key, String label, String emoji, Boolean hidden) {
        User u = load(userId);
        boolean builtIn = builtIns(kind).contains(key);
        List<CategoryPrefs.Entry> entries = prefs(u).of(kind);
        Optional<CategoryPrefs.Entry> found = entries.stream().filter(e -> e.getKey().equals(key)).findFirst();
        if (!builtIn && found.isEmpty()) throw ApiException.notFound("Category");
        if (Boolean.TRUE.equals(hidden) && OTHER.equals(key)) throw ApiException.badRequest("Other is where everything else goes, so it can't be hidden");
        CategoryPrefs.Entry e = found.orElseGet(() -> {
            CategoryPrefs.Entry n = new CategoryPrefs.Entry(key, null, null, false, false);
            entries.add(n);
            return n;
        });
        if (label != null) {
            String name = clean(label);
            if (list(u, kind).stream().anyMatch(v -> !v.key().equals(key) && v.label().equalsIgnoreCase(name)))
                throw ApiException.badRequest("You already have a category called " + name);
            e.setLabel(builtIn && name.equals(builtInLabel(key)) ? null : name);
        }
        if (emoji != null) e.setEmoji(blank(emoji));
        if (hidden != null) e.setHidden(hidden);
        // a built-in back to exactly as shipped needs no entry
        if (builtIn && e.getLabel() == null && e.getEmoji() == null && !e.isHidden()) entries.remove(e);
        users.save(u);
        return list(u, kind).stream().filter(v -> v.key().equals(key)).findFirst().orElseThrow();
    }

    /** Deletes one of the user's own categories, moving everything filed under it to `moveTo`. Returns how many moved. */
    public long delete(String userId, CategoryKind kind, String key, String moveTo) {
        User u = load(userId);
        List<CategoryPrefs.Entry> entries = prefs(u).of(kind);
        CategoryPrefs.Entry e = entries.stream().filter(x -> x.isCustom() && x.getKey().equals(key)).findFirst()
                .orElseThrow(() -> builtIns(kind).contains(key) ? ApiException.badRequest("Built-in categories can be hidden, not deleted") : ApiException.notFound("Category"));
        String target = moveTo == null || moveTo.isBlank() ? OTHER : moveTo;
        if (target.equals(key)) throw ApiException.badRequest("Pick another category to move its entries into");
        requireValid(userId, kind, target);

        long moved;
        if (kind == CategoryKind.EXPENSE) {
            moved = mongo.updateMulti(Query.query(Criteria.where("userId").is(userId).and("category").is(key)), Update.update("category", target), "expenses").getModifiedCount();
            mongo.updateMulti(Query.query(Criteria.where("userId").is(userId).and("category").is(key)), Update.update("category", target), "merchant_rules");
            mongo.updateMulti(Query.query(Criteria.where("userId").is(userId).and("excludedCategories").is(key)), new Update().pull("excludedCategories", key), "budgets");
        } else {
            moved = mongo.updateMulti(Query.query(Criteria.where("userId").is(userId).and("type").is(key)), Update.update("type", target), "incomes").getModifiedCount();
        }
        entries.remove(e);
        users.save(u);
        return moved;
    }

    // ------------------------------------------------------------------ helpers

    public static String builtInLabel(String key) {
        if ("EMI".equals(key)) return "EMI";
        String s = key.replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private String uniqueKey(User u, CategoryKind kind, String label) {
        String base = label.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (base.isEmpty()) base = "CUSTOM";
        if (base.length() > 30) base = base.substring(0, 30);
        List<String> taken = new ArrayList<>(builtIns(kind));
        prefs(u).of(kind).forEach(e -> taken.add(e.getKey()));
        String key = base;
        for (int n = 2; taken.contains(key); n++) key = base + "_" + n;
        return key;
    }

    private static String clean(String label) {
        String s = label == null ? "" : label.trim().replaceAll("\\s+", " ");
        if (s.isEmpty()) throw ApiException.badRequest("Give the category a name");
        if (s.length() > 30) throw ApiException.badRequest("Keep the name to 30 characters");
        return s;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static CategoryPrefs prefs(User u) {
        if (u.getCategories() == null) u.setCategories(new CategoryPrefs());
        return u.getCategories();
    }

    private User load(String userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }
}
