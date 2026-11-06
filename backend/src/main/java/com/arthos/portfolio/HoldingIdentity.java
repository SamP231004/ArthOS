package com.arthos.portfolio;

import com.arthos.portfolio.Holding.AssetClass;
import com.arthos.portfolio.Holding.GoldForm;

import java.util.Locale;
import java.util.Objects;

/**
 * When two holdings are the same instrument, so buying it again adds a transaction to the existing holding instead of
 * creating a second row:
 * <ul>
 *   <li>stocks/ETFs: same ticker on either exchange (ETERNAL.NS = ETERNAL.BO), or the same company name;</li>
 *   <li>mutual funds: same AMFI scheme code;</li>
 *   <li>gold: same form and purity (Sovereign Gold Bonds also need the same series name);</li>
 *   <li>bonds: same name.</li>
 * </ul>
 */
public final class HoldingIdentity {

    private HoldingIdentity() {}

    public static boolean same(Holding a, Holding b) {
        if (a.getAssetClass() != b.getAssetClass()) return false;
        return switch (a.getAssetClass()) {
            case STOCK -> {
                String ta = ticker(a.getSymbol()), tb = ticker(b.getSymbol());
                yield (!ta.isEmpty() && ta.equals(tb)) || (!name(a.getName()).isEmpty() && name(a.getName()).equals(name(b.getName())));
            }
            case MUTUAL_FUND -> a.getSymbol() != null && a.getSymbol().equalsIgnoreCase(Objects.toString(b.getSymbol(), ""));
            case GOLD -> a.getGoldForm() == b.getGoldForm() && a.getPurity() == b.getPurity()
                    && (a.getGoldForm() != GoldForm.SGB || name(a.getName()).equals(name(b.getName())));
            case BOND -> name(a.getName()).equals(name(b.getName()));
        };
    }

    /** Exchange suffix dropped: "ETERNAL.NS" / "ETERNAL.BO" → "ETERNAL". */
    static String ticker(String symbol) {
        if (symbol == null) return "";
        return symbol.toUpperCase(Locale.ROOT).replaceAll("\\.(NS|BO)$", "").trim();
    }

    /** Company/fund name without legal suffixes and punctuation: "Eternal Ltd." = "ETERNAL LIMITED". */
    static String name(String n) {
        if (n == null) return "";
        return n.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\b(limited|ltd|the|inc|co)\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /** Asset classes whose holdings are matched by search symbol (others by attributes). */
    static boolean bySymbol(AssetClass c) {
        return c == AssetClass.STOCK || c == AssetClass.MUTUAL_FUND;
    }
}
