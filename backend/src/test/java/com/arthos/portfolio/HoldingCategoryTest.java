package com.arthos.portfolio;

import com.arthos.portfolio.Holding.AssetClass;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HoldingCategoryTest {

    private static Holding h(AssetClass c, String name, String symbol) {
        Holding h = new Holding();
        h.setAssetClass(c);
        h.setName(name);
        h.setSymbol(symbol);
        return h;
    }

    @Test
    void goldFundsCountAsGoldButSilverStaysAFund() {
        assertEquals(AssetClass.GOLD, h(AssetClass.MUTUAL_FUND, "SBI GOLD FUND - Direct Plan - Growth", "119788").category());
        assertEquals(AssetClass.MUTUAL_FUND, h(AssetClass.MUTUAL_FUND, "ICICI Prudential Silver ETF FoF - Direct Plan - Growth", "149760").category());
        assertEquals(AssetClass.MUTUAL_FUND, h(AssetClass.MUTUAL_FUND, "HDFC Multi Cap Fund - Direct Plan - Growth Option", "149368").category());
    }

    @Test
    void onlyGoldEtfsCountAsGoldAmongStocks() {
        assertEquals(AssetClass.GOLD, h(AssetClass.STOCK, "GOLDBEES · GOLD ETF", "GOLDBEES.NS").category());
        assertEquals(AssetClass.GOLD, h(AssetClass.STOCK, "Nippon India Gold BeES", "GOLDBEES.NS").category());
        assertEquals(AssetClass.STOCK, h(AssetClass.STOCK, "Shanti Gold International Limited", "SHANTIGOLD.NS").category());
        assertEquals(AssetClass.STOCK, h(AssetClass.STOCK, "Goldiam International Limited", "GOLDIAM.NS").category());
    }

    @Test
    void usGoldEtfsCountAsGoldButMinersAndStocksDoNot() {
        assertEquals(AssetClass.GOLD, h(AssetClass.US_STOCK, "SPDR Gold Shares", "GLD").category());
        assertEquals(AssetClass.GOLD, h(AssetClass.US_STOCK, "iShares Gold Trust", "IAU").category());
        assertEquals(AssetClass.GOLD, h(AssetClass.US_STOCK, "abrdn Gold ETF Trust", "SGOL").category());
        assertEquals(AssetClass.US_STOCK, h(AssetClass.US_STOCK, "VanEck Gold Miners ETF", "GDX").category());
        assertEquals(AssetClass.US_STOCK, h(AssetClass.US_STOCK, "Apple Inc.", "AAPL").category());
        assertEquals(AssetClass.US_STOCK, h(AssetClass.US_STOCK, "SPDR Gold Shares", "GLD").category(false)); // setting off
    }

    @Test
    void theSettingTurnsTheAutomaticRuleOff() {
        Holding fund = h(AssetClass.MUTUAL_FUND, "SBI GOLD FUND - Direct Plan - Growth", "119788");
        assertEquals(AssetClass.MUTUAL_FUND, fund.category(false));
        fund.setCountAs(AssetClass.GOLD); // a holding the user moved by hand still moves
        assertEquals(AssetClass.GOLD, fund.category(false));
    }

    @Test
    void theUsersChoiceWins() {
        Holding fund = h(AssetClass.MUTUAL_FUND, "SBI GOLD FUND - Direct Plan - Growth", "119788");
        fund.setCountAs(AssetClass.MUTUAL_FUND);
        assertEquals(AssetClass.MUTUAL_FUND, fund.category());
        Holding etf = h(AssetClass.STOCK, "Some Commodity ETF", "XYZ.NS");
        etf.setCountAs(AssetClass.GOLD);
        assertEquals(AssetClass.GOLD, etf.category());
    }
}
