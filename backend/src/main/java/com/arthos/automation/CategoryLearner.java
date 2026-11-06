package com.arthos.automation;

import com.arthos.expense.ExpenseCategory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

/**
 * Smart categories that learn from the user (blueprint §11, §17): every saved expense with a merchant teaches
 * "merchant → category", and the latest choice wins, so a correction is remembered immediately. Suggestions prefer
 * what the user taught, then the built-in {@link CategoryRules}.
 */
@Service
public class CategoryLearner {

    public enum Source { LEARNED, BUILT_IN, NONE }

    public record Suggestion(ExpenseCategory category, Source source) {}

    private final MerchantRuleRepository rules;

    public CategoryLearner(MerchantRuleRepository rules) {
        this.rules = rules;
    }

    public Suggestion suggest(String userId, String merchant, String text) {
        String key = MerchantKey.of(merchant);
        if (!key.isBlank()) {
            Optional<MerchantRule> learned = rules.findByUserIdAndKey(userId, key);
            if (learned.isPresent()) return new Suggestion(learned.get().getCategory(), Source.LEARNED);
        }
        return CategoryRules.expense(merchant, text)
                .map(c -> new Suggestion(c, Source.BUILT_IN))
                .orElse(new Suggestion(null, Source.NONE));
    }

    /** Remember the category the user just saved for this merchant. */
    public void learn(String userId, String merchant, ExpenseCategory category, Instant expiresAt) {
        String key = MerchantKey.of(merchant);
        if (key.isBlank() || category == null) return;
        MerchantRule r = rules.findByUserIdAndKey(userId, key).orElseGet(MerchantRule::new);
        boolean same = category == r.getCategory();
        r.setUserId(userId);
        r.setKey(key);
        r.setCategory(category);
        r.setUses(same ? r.getUses() + 1 : 1);
        r.setUpdatedAt(Instant.now());
        r.setExpiresAt(expiresAt);
        try {
            rules.save(r);
        } catch (DuplicateKeyException ignored) {
            // a concurrent save created the rule first; the next save will update it
        }
    }
}
