package com.arthos.automation;

import com.arthos.expense.PaymentSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Turns OCR text from a payment screenshot (GPay, PhonePe, Paytm, BHIM, bank apps), a bank SMS or a shop receipt into
 * a draft transaction (blueprint §10): amount, date, merchant, reference, income vs expense and payment method.
 * Pure and deterministic, so it's unit-tested against real-world layouts; every field is optional and the user
 * confirms (and can edit) everything before it's saved.
 */
public final class TransactionTextParser {

    public enum Kind { INCOME, EXPENSE }

    public record Parsed(Kind kind, BigDecimal amount, LocalDate date, String merchant, String reference,
                         PaymentSource paymentSource, double confidence, List<String> found) {}

    // ₹ is often read by OCR as %, Z, z, X, ? or & right before the digits
    private static final String NUM = "([0-9]{1,3}(?:,[0-9]{2,3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)";
    private static final Pattern MONEY = Pattern.compile("(?:₹|rs\\.?|inr|rupees|र)\\s*" + NUM, Pattern.CASE_INSENSITIVE);
    private static final Pattern MONEY_LOOSE_LINE = Pattern.compile("^\\s*[₹%Zz?&Xx]?\\s*" + NUM + "\\s*(?:/-)?\\s*$");
    private static final Pattern TOTAL_LINE = Pattern.compile("(?i)\\b(grand\\s*total|net\\s*(?:amount|payable|total)|total\\s*(?:amount|payable|due)?|amount\\s*(?:paid|payable|due)?|bill\\s*amount|you\\s*paid)\\b");
    private static final Pattern NOT_THE_AMOUNT = Pattern.compile("(?i)\\b(balance|bal\\b|available|avl|limit|cashback|reward|saved|savings|discount|you save|mrp|tax|gst|cgst|sgst|round\\s*off|tip|fee)\\b");
    private static final Pattern VERB_AMOUNT = Pattern.compile("(?i)\\b(?:paid|debited|credited|received|sent|spent|transferred|withdrawn|deposited)\\b[^0-9\\n]{0,20}" + NUM);

    private static final Pattern VPA = Pattern.compile("\\b([a-zA-Z0-9.\\-_]{2,})@([a-zA-Z]{2,})\\b");
    private static final Pattern REF = Pattern.compile(
            "(?i)(?:upi\\s*(?:transaction|txn|ref(?:erence)?)?\\s*(?:id|no\\.?|number)|utr(?:\\s*(?:no\\.?|number))?|ref(?:erence)?\\s*(?:no\\.?|number|id)|transaction\\s*(?:id|no\\.?)|txn\\s*(?:id|no\\.?)|order\\s*id|bill\\s*no\\.?|invoice\\s*no\\.?)\\s*[:#.\\-]?\\s*([A-Za-z0-9\\-]{6,})");
    private static final Pattern RRN = Pattern.compile("(?<![0-9])([0-9]{12})(?![0-9])");

    private static final Map<String, Month> MONTHS = new HashMap<>();
    static {
        for (Month m : Month.values()) {
            String full = m.name().toLowerCase(Locale.ROOT);
            MONTHS.put(full, m);
            MONTHS.put(full.substring(0, 3), m);
        }
        MONTHS.put("sept", Month.SEPTEMBER);
    }
    private static final String MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
    private static final Pattern D_MON_Y = Pattern.compile("(?i)\\b([0-3]?[0-9])(?:st|nd|rd|th)?[\\s\\-/.,]+" + MON + "[\\s\\-/.,']+([0-9]{2,4})\\b");
    private static final Pattern MON_D_Y = Pattern.compile("(?i)\\b" + MON + "\\s+([0-3]?[0-9])(?:st|nd|rd|th)?,?\\s+([0-9]{4})\\b");
    private static final Pattern D_MON = Pattern.compile("(?i)\\b([0-3]?[0-9])(?:st|nd|rd|th)?\\s+" + MON + "\\b");
    private static final Pattern NUMERIC = Pattern.compile("\\b([0-3]?[0-9])[/\\-.]([01]?[0-9])[/\\-.]([0-9]{2,4})\\b");
    private static final Pattern ISO = Pattern.compile("\\b(20[0-9]{2})-([01][0-9])-([0-3][0-9])\\b");

    private static final List<String> INCOME_MARKERS = List.of("received from", "credited to your", "credited to a/c", "credited in your", "has been credited", "is credited", "money received", "you received", "received ₹", "received rs", "refund", "cashback of", "deposited", "credit alert", "salary");
    private static final List<String> EXPENSE_MARKERS = List.of("paid to", "debited from", "has been debited", "is debited", "sent to", "payment to", "you paid", "paid successfully", "payment successful", "spent", "purchase", "transferred to", "debit alert", "withdrawn", "paid via", "bill paid", "order placed");
    private static final Pattern TO_LINE = Pattern.compile("(?i)^\\s*(?:paid\\s+to|sent\\s+to|payment\\s+to|transferred\\s+to|paying|to)\\s*[:\\-]?\\s+(.{2,60})$");
    private static final Pattern FROM_LINE = Pattern.compile("(?i)^\\s*(?:received\\s+from|from)\\s*[:\\-]?\\s+(.{2,60})$");
    private static final Pattern LABEL_ONLY = Pattern.compile("(?i)^\\s*(paid to|sent to|payment to|to|received from|from|banking name|merchant|payee)\\s*:?\\s*$");
    private static final Pattern SMS_AT = Pattern.compile("(?i)\\b(?:at|towards|info[:\\-]?)\\s+([A-Za-z0-9][A-Za-z0-9 &.'\\-*]{2,40}?)(?=\\s+(?:on|ref|via|using|for|upi|txn|avl|bal)\\b|[.,;]|$)");
    private static final Pattern SMS_TO = Pattern.compile("(?i)\\b(?:to|trf to|transfer to|credited to)\\s+([A-Za-z][A-Za-z0-9 &.'\\-]{2,40}?)(?=\\s+(?:on|ref|via|upi|txn|a/c|ac)\\b|[.,;]|$)");
    private static final Pattern NOISE = Pattern.compile("(?i)(\\+?91[\\s\\-]?)?[6-9][0-9]{9}|x{2,}[0-9]{2,4}|\\*{2,}[0-9]{2,4}|\\b(a/c|ac|account|bank|upi id|upi|vpa)\\b.*$");
    /** Where a merchant name stops: the amount, a date/time, or words like "on"/"via"/"ref". */
    private static final Pattern NAME_END = Pattern.compile("(?i)\\s+(?:on|via|ref|for|using|upi|dated)\\s+|₹|%(?=\\d)|\\brs\\.?\\s*\\d|\\binr\\b|\\s\\d{1,2}[:/\\-]\\d");
    private static final List<String> RECEIPT_SKIP = List.of("tax invoice", "invoice", "receipt", "bill", "gst", "gstin", "date", "time", "cash memo", "welcome", "thank", "order", "customer", "phone", "tel", "www", "http", "payment", "transaction", "successful", "completed", "upi", "google pay", "phonepe", "paytm", "bhim");

    private TransactionTextParser() {}

    public static Parsed parse(String text, LocalDate today) {
        String raw = text == null ? "" : text.replace('\r', '\n');
        List<String> lines = Arrays.stream(raw.split("\n")).map(String::strip).filter(l -> !l.isEmpty()).toList();
        String lower = raw.toLowerCase(Locale.ROOT);
        List<String> found = new ArrayList<>();

        Kind kind = kind(lower);
        BigDecimal amount = amount(lines, raw);
        LocalDate date = date(raw, today);
        String merchant = merchant(lines, raw, kind);
        String reference = reference(raw);
        PaymentSource via = paymentSource(lower);

        double confidence = 0;
        if (amount != null) { confidence += 0.5; found.add("amount"); }
        if (merchant != null) { confidence += 0.25; found.add("merchant"); }
        if (date != null) { confidence += 0.15; found.add("date"); }
        if (markers(lower, INCOME_MARKERS) + markers(lower, EXPENSE_MARKERS) > 0) { confidence += 0.1; found.add("type"); }
        if (reference != null) found.add("reference");
        return new Parsed(kind, amount, date, merchant, reference, via, Math.round(confidence * 100) / 100.0, found);
    }

    // ---------------------------------------------------------------- kind

    static Kind kind(String lower) {
        int income = markers(lower, INCOME_MARKERS);
        int expense = markers(lower, EXPENSE_MARKERS);
        // "debited from your a/c" is decisive even when the SMS also says "credited to <merchant>"
        if (lower.contains("debited")) expense += 2;
        if (lower.contains("credited to your") || lower.contains("credited to a/c") || lower.contains("credited in your")) income += 2;
        return income > expense ? Kind.INCOME : Kind.EXPENSE;
    }

    private static int markers(String lower, List<String> markers) {
        int n = 0;
        for (String m : markers) if (lower.contains(m)) n++;
        return n;
    }

    // ---------------------------------------------------------------- amount

    static BigDecimal amount(List<String> lines, String raw) {
        // 1. receipts: the line labelled total / amount paid (grand total beats a plain total)
        BigDecimal best = null;
        int bestRank = -1;
        for (int i = 0; i < lines.size(); i++) {
            String l = lines.get(i);
            Matcher t = TOTAL_LINE.matcher(l);
            if (!t.find() || NOT_THE_AMOUNT.matcher(l).find() && !l.toLowerCase(Locale.ROOT).contains("total")) continue;
            int rank = t.group(1).toLowerCase(Locale.ROOT).startsWith("grand") || t.group(1).toLowerCase(Locale.ROOT).startsWith("net") ? 3
                    : t.group(1).toLowerCase(Locale.ROOT).startsWith("total") ? 2 : 1;
            BigDecimal v = lastNumber(l.substring(t.end()));
            if (v == null && i + 1 < lines.size()) v = lastNumber(lines.get(i + 1)); // value on the next line
            if (v != null && v.signum() > 0 && rank >= bestRank) {
                best = v;
                bestRank = rank;
            }
        }
        if (best != null) return best;

        // 2. currency-marked amounts, skipping balances/cashback; the most repeated wins, then the largest
        Map<BigDecimal, Integer> counts = new LinkedHashMap<>();
        for (String l : lines) {
            Matcher m = MONEY.matcher(l);
            while (m.find()) {
                // judge each amount by the words just before it, so "Avl Bal Rs.48,212" in the same SMS is skipped
                // without losing "Rs.649 debited" earlier on the line
                String before = l.substring(Math.max(0, m.start() - 28), m.start());
                if (NOT_THE_AMOUNT.matcher(before).find()) continue;
                BigDecimal v = num(m.group(1));
                if (v != null && v.signum() > 0) counts.merge(v, 1, Integer::sum);
            }
        }
        if (!counts.isEmpty()) {
            return counts.entrySet().stream()
                    .max(Map.Entry.<BigDecimal, Integer>comparingByValue().thenComparing(Map.Entry.comparingByKey()))
                    .get().getKey();
        }

        // 3. payment-app hero: a line that is just the amount (₹ often misread by OCR)
        for (String l : lines) {
            Matcher m = MONEY_LOOSE_LINE.matcher(l);
            if (m.matches()) {
                BigDecimal v = num(m.group(1));
                // not a year, a 10/12-digit phone/RRN, or a time
                if (v != null && v.signum() > 0 && !m.group(1).matches("(19|20)[0-9]{2}") && m.group(1).replace(",", "").replace(".", "").length() <= 8) return v;
            }
        }

        // 4. SMS: "debited by 1,250.00", "paid 500" — never an account/card number like "A/c XX4821"
        Matcher v = VERB_AMOUNT.matcher(raw);
        while (v.find()) {
            String between = raw.substring(v.start(), v.start(1)).toLowerCase(Locale.ROOT);
            if (between.contains("a/c") || between.contains("xx") || between.contains("card") || between.contains("ac ")) continue;
            return num(v.group(1));
        }
        return null;
    }

    private static BigDecimal lastNumber(String s) {
        Matcher m = Pattern.compile(NUM).matcher(s);
        BigDecimal last = null;
        while (m.find()) last = num(m.group(1));
        return last;
    }

    private static BigDecimal num(String s) {
        try {
            BigDecimal v = new BigDecimal(s.replace(",", ""));
            return v.compareTo(BigDecimal.valueOf(1_00_00_00_000L)) > 0 ? null : v.stripTrailingZeros().scale() < 0 ? v.setScale(0) : v;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ---------------------------------------------------------------- date

    static LocalDate date(String raw, LocalDate today) {
        List<LocalDate> candidates = new ArrayList<>();
        Matcher m = D_MON_Y.matcher(raw);
        while (m.find()) add(candidates, safe(year(m.group(3)), MONTHS.get(monKey(m.group(2))), m.group(1)));
        m = MON_D_Y.matcher(raw);
        while (m.find()) add(candidates, safe(year(m.group(3)), MONTHS.get(monKey(m.group(1))), m.group(2)));
        m = ISO.matcher(raw);
        while (m.find()) add(candidates, safe(Integer.parseInt(m.group(1)), Month.of(clampMonth(m.group(2))), m.group(3)));
        m = NUMERIC.matcher(raw);
        while (m.find()) {
            int mm = Integer.parseInt(m.group(2));
            if (mm >= 1 && mm <= 12) add(candidates, safe(year(m.group(3)), Month.of(mm), m.group(1))); // Indian order: dd/mm/yyyy
        }
        if (candidates.isEmpty()) {
            m = D_MON.matcher(raw);
            while (m.find()) {
                LocalDate d = safe(today.getYear(), MONTHS.get(monKey(m.group(2))), m.group(1));
                if (d != null && d.isAfter(today)) d = d.minusYears(1);
                add(candidates, d);
            }
        }
        return candidates.stream().filter(d -> !d.isAfter(today) && !d.isBefore(today.minusDays(400))).findFirst().orElse(null);
    }

    private static void add(List<LocalDate> list, LocalDate d) {
        if (d != null) list.add(d);
    }

    private static String monKey(String s) {
        String k = s.toLowerCase(Locale.ROOT);
        return k.startsWith("sept") ? "sept" : k.length() > 3 && !MONTHS.containsKey(k) ? k.substring(0, 3) : k;
    }

    private static int clampMonth(String s) {
        int v = Integer.parseInt(s);
        return Math.max(1, Math.min(12, v));
    }

    private static int year(String s) {
        int y = Integer.parseInt(s);
        return y < 100 ? 2000 + y : y;
    }

    private static LocalDate safe(int y, Month month, String day) {
        try {
            return month == null ? null : LocalDate.of(y, month, Integer.parseInt(day));
        } catch (Exception e) {
            return null;
        }
    }

    // ---------------------------------------------------------------- merchant

    static String merchant(List<String> lines, String raw, Kind kind) {
        Pattern line = kind == Kind.INCOME ? FROM_LINE : TO_LINE;
        for (int i = 0; i < lines.size(); i++) {
            String l = lines.get(i);
            if (LABEL_ONLY.matcher(l).matches()) {
                String label = l.toLowerCase(Locale.ROOT);
                boolean wanted = kind == Kind.INCOME ? label.contains("from") : !label.contains("from");
                if (wanted && i + 1 < lines.size()) {
                    String c = clean(lines.get(i + 1));
                    if (c != null) return c;
                }
                continue;
            }
            Matcher m = line.matcher(l);
            if (m.matches()) {
                String c = clean(m.group(1));
                if (c != null) return c;
            }
        }
        Matcher sms = (kind == Kind.INCOME ? Pattern.compile("(?i)\\bfrom\\s+([A-Za-z][A-Za-z0-9 &.'\\-]{2,40}?)(?=\\s+(?:on|ref|via|upi|txn|a/c|ac)\\b|[.,;]|$)") : SMS_AT).matcher(raw);
        if (sms.find()) {
            String c = clean(sms.group(1));
            if (c != null) return c;
        }
        if (kind == Kind.EXPENSE) {
            Matcher to = SMS_TO.matcher(raw);
            while (to.find()) {
                String c = clean(to.group(1));
                if (c != null && !c.toLowerCase(Locale.ROOT).startsWith("your")) return c;
            }
        }
        Matcher vpa = VPA.matcher(raw);
        if (vpa.find()) {
            String c = clean(vpa.group(1).replaceAll("[0-9]{4,}", " ").replaceAll("[._\\-]+", " "));
            if (c != null) return c;
        }
        // receipts: the shop name is usually one of the first lines
        for (int i = 0; i < Math.min(5, lines.size()); i++) {
            String l = lines.get(i);
            String lower = l.toLowerCase(Locale.ROOT);
            if (RECEIPT_SKIP.stream().anyMatch(lower::contains) || MONEY.matcher(l).find() || l.replaceAll("[^A-Za-z]", "").length() < 3) continue;
            String c = clean(l);
            if (c != null) return c;
        }
        return null;
    }

    private static String clean(String s) {
        if (s == null) return null;
        // the name ends where the amount, date or details begin: "Uber ₹312 on 12 Dec" → "Uber"
        String c = NAME_END.split(s, 2)[0];
        c = VPA.matcher(c).replaceAll(" ");
        c = NOISE.matcher(c).replaceAll(" ");
        c = c.replaceAll("[|•·:;,]+", " ").replaceAll("\\s+", " ").strip();
        c = c.replaceAll("^[^A-Za-z0-9]+|[^A-Za-z0-9).]+$", "");
        if (c.replaceAll("[^A-Za-z]", "").length() < 2) return null;
        String lower = c.toLowerCase(Locale.ROOT);
        if (lower.matches("(you|your|self|me|google pay|gpay|phonepe|paytm|bhim|upi|bank|completed|successful|success|pending)\\b.*")) return null;
        if (c.length() > 48) c = c.substring(0, 48).strip();
        return titleIfShouty(c);
    }

    private static String titleIfShouty(String s) {
        boolean allUpper = s.equals(s.toUpperCase(Locale.ROOT)) && s.chars().anyMatch(Character::isLetter);
        boolean allLower = s.equals(s.toLowerCase(Locale.ROOT));
        if (!allUpper && !allLower) return s;
        StringBuilder b = new StringBuilder();
        for (String w : s.toLowerCase(Locale.ROOT).split(" ")) {
            if (w.isEmpty()) continue;
            if (!b.isEmpty()) b.append(' ');
            b.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
        }
        return b.toString();
    }

    // ---------------------------------------------------------------- reference & method

    static String reference(String raw) {
        Matcher m = REF.matcher(raw);
        while (m.find()) {
            String v = m.group(1);
            if (v.chars().anyMatch(Character::isDigit)) return v;
        }
        Matcher rrn = RRN.matcher(raw);
        return rrn.find() ? rrn.group(1) : null;
    }

    static PaymentSource paymentSource(String lower) {
        if (lower.contains("credit card") || lower.matches("(?s).*\\bcc\\b.*")) return PaymentSource.CREDIT_CARD;
        if (lower.contains("debit card")) return PaymentSource.DEBIT_CARD;
        if (lower.contains("upi") || VPA.matcher(lower).find() || lower.contains("google pay") || lower.contains("gpay") || lower.contains("phonepe") || lower.contains("bhim")
                || lower.contains("paytm")) return PaymentSource.UPI;
        if (lower.contains("neft") || lower.contains("imps") || lower.contains("rtgs") || lower.contains("bank transfer")) return PaymentSource.BANK_TRANSFER;
        if (lower.contains("wallet") || lower.contains("amazon pay")) return PaymentSource.WALLET;
        if (lower.contains("card")) return PaymentSource.DEBIT_CARD;
        if (lower.contains("cash")) return PaymentSource.CASH;
        return null;
    }

    /** A read is only usable as a transaction if it found an amount (a name alone could be any text). */
    public static Optional<Parsed> usable(Parsed p) {
        return p.amount() == null ? Optional.empty() : Optional.of(p);
    }
}
