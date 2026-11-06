package com.arthos.automation;

import com.arthos.expense.ExpenseCategory;
import com.arthos.income.IncomeType;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import static com.arthos.expense.ExpenseCategory.*;

/**
 * Built-in merchant/keyword → category knowledge for Indian spending, used when the user hasn't taught ArthOS a
 * mapping yet. Order matters: the first matching rule wins (more specific rules come first).
 */
public final class CategoryRules {

    private static final Map<ExpenseCategory, List<String>> EXPENSE = new LinkedHashMap<>();
    static {
        EXPENSE.put(RENT, List.of("rent", "landlord", "nobroker", "nestaway", "housing society", "maintenance"));
        EXPENSE.put(EMI, List.of("emi", "loan", "bajaj finserv", "home credit", "credit card bill", "card bill", "cred"));
        EXPENSE.put(SUBSCRIPTIONS, List.of("netflix", "spotify", "prime video", "amazon prime", "hotstar", "jiocinema", "youtube premium", "youtube", "apple com", "apple", "icloud", "google play", "google one", "zee5", "sonyliv", "audible", "chatgpt", "openai", "notion"));
        EXPENSE.put(GROCERIES, List.of("blinkit", "zepto", "bigbasket", "big basket", "instamart", "dmart", "d mart", "jiomart", "more supermarket", "reliance fresh", "nature s basket", "spencer", "grocery", "grocer", "kirana", "supermarket", "milk", "dairy", "country delight"));
        EXPENSE.put(FOOD, List.of("swiggy", "zomato", "eatsure", "domino", "pizza", "mcdonald", "kfc", "burger", "subway", "starbucks", "third wave", "blue tokai", "chaayos", "cafe", "coffee", "restaurant", "dhaba", "biryani", "bakery", "truffles", "canteen", "food", "eatery", "kitchen", "haldiram"));
        EXPENSE.put(TRAVEL, List.of("irctc", "indigo", "air india", "vistara", "akasa", "spicejet", "makemytrip", "goibibo", "cleartrip", "easemytrip", "ixigo", "airbnb", "oyo", "hotel", "resort", "booking com", "agoda", "redbus", "abhibus"));
        EXPENSE.put(TRANSPORT, List.of("uber", "ola", "rapido", "namma yatri", "blusmart", "metro", "bmtc", "best bus", "petrol", "fuel", "diesel", "hpcl", "bpcl", "indian oil", "iocl", "shell", "fastag", "toll", "parking", "auto", "cab", "taxi"));
        EXPENSE.put(UTILITIES, List.of("electricity", "bescom", "tata power", "adani electricity", "msedcl", "tneb", "power", "water bill", "gas bill", "indane", "bharat gas", "hp gas", "piped gas", "broadband", "act fibernet", "fibernet", "airtel", "jio", "vodafone", "vi recharge", "bsnl", "recharge", "postpaid", "prepaid", "dth", "tata play", "wifi"));
        EXPENSE.put(HEALTH, List.of("apollo", "pharmacy", "medplus", "1mg", "pharmeasy", "netmeds", "hospital", "clinic", "doctor", "dental", "diagnostic", "lab", "practo", "cult", "gym", "fitness", "yoga"));
        EXPENSE.put(PERSONAL_CARE, List.of("salon", "spa", "barber", "urban company", "nykaa", "purplle", "mamaearth", "lakme", "parlour", "parlor"));
        EXPENSE.put(ENTERTAINMENT, List.of("pvr", "inox", "cinepolis", "bookmyshow", "district", "paytm insider", "steam", "playstation", "xbox", "gaming", "concert", "movie"));
        EXPENSE.put(EDUCATION, List.of("udemy", "coursera", "unacademy", "byju", "physics wallah", "upgrad", "school", "college", "university", "tuition", "coaching", "course", "fees", "exam", "books", "bookstore"));
        EXPENSE.put(SHOPPING, List.of("amazon", "flipkart", "myntra", "ajio", "meesho", "tata cliq", "decathlon", "ikea", "croma", "reliance digital", "vijay sales", "lifestyle", "pantaloons", "westside", "zara", "h m", "uniqlo", "shoppers stop", "mall", "store"));
        EXPENSE.put(GIFTS, List.of("gift", "ferns n petals", "fnp", "igp", "donation", "charity"));
    }

    private static final Map<IncomeType, List<String>> INCOME = new LinkedHashMap<>();
    static {
        INCOME.put(IncomeType.SALARY, List.of("salary", "payroll", "sal cr", "wages"));
        INCOME.put(IncomeType.BONUS, List.of("bonus", "incentive"));
        INCOME.put(IncomeType.DIVIDEND, List.of("dividend", "div "));
        INCOME.put(IncomeType.INTEREST, List.of("interest", "int pd", "fd maturity", "savings account"));
        INCOME.put(IncomeType.REFUND, List.of("refund", "reversal", "reversed", "cashback", "chargeback"));
        INCOME.put(IncomeType.FREELANCE, List.of("invoice", "freelance", "consulting", "project", "upwork", "fiverr"));
    }

    private CategoryRules() {}

    /** Category for a merchant, falling back to keywords anywhere in the extracted text. */
    public static Optional<ExpenseCategory> expense(String merchant, String text) {
        Optional<ExpenseCategory> byMerchant = match(EXPENSE, MerchantKey.of(merchant));
        return byMerchant.isPresent() ? byMerchant : match(EXPENSE, MerchantKey.of(text));
    }

    public static Optional<IncomeType> income(String source, String text) {
        Optional<IncomeType> bySource = match(INCOME, MerchantKey.of(source));
        return bySource.isPresent() ? bySource : match(INCOME, MerchantKey.of(text));
    }

    private static <T> Optional<T> match(Map<T, List<String>> rules, String normalised) {
        if (normalised.isBlank()) return Optional.empty();
        String hay = " " + normalised.toLowerCase(Locale.ROOT) + " ";
        for (Map.Entry<T, List<String>> e : rules.entrySet()) {
            for (String kw : e.getValue()) {
                // whole-word match, so "ola" doesn't fire inside "cola" and "auto" not inside "automatic"
                if (Pattern.compile("(?<![a-z0-9])" + Pattern.quote(kw.trim()) + "(?![a-z0-9])").matcher(hay).find()) return Optional.of(e.getKey());
            }
        }
        return Optional.empty();
    }
}
