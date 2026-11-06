package com.arthos.automation;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Normalises merchant names so the same merchant matches however it's written: "SWIGGY", "Swiggy Ltd.",
 * "swiggy@icici" and "Swiggy Instamart" → "swiggy" / "swiggy instamart" (the UPI handle, legal suffixes and
 * punctuation are dropped).
 */
public final class MerchantKey {

    private static final Pattern VPA_DOMAIN = Pattern.compile("@[a-z0-9.\\-]+");
    private static final Pattern SUFFIX = Pattern.compile("\\b(pvt|private|ltd|limited|llp|inc|india|technologies|tech|services|store|stores|online|retail|co)\\b");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9 ]+");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private MerchantKey() {}

    public static String of(String merchant) {
        if (merchant == null) return "";
        String s = merchant.toLowerCase(Locale.ROOT);
        s = VPA_DOMAIN.matcher(s).replaceAll(" ");
        s = s.replace('.', ' ').replace('_', ' ').replace('-', ' ');
        s = NON_ALNUM.matcher(s).replaceAll(" ");
        s = SUFFIX.matcher(s).replaceAll(" ");
        s = SPACES.matcher(s).replaceAll(" ").trim();
        return s.length() > 60 ? s.substring(0, 60).trim() : s;
    }
}
