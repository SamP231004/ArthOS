package com.arthos.market;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ReferenceIndexTest {

    @Test
    void parsesNseEquityAndEtfLists() {
        List<String[]> eq = ReferenceIndex.parseEquity("""
                SYMBOL,NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
                20MICRONS,20 Microns Limited,EQ,06-OCT-2008,5,1,INE144J01027,5
                RELIANCE,"Reliance Industries Limited",EQ,29-NOV-1995,10,1,INE002A01018,10
                """);
        assertEquals(2, eq.size());
        assertArrayEquals(new String[] {"INE002A01018", "RELIANCE", "Reliance Industries Limited"}, eq.get(1));
        List<String[]> etf = ReferenceIndex.parseEtf("""
                Symbol,Underlying Asset,SecurityName,DateofListing,MarketLot,ISINNumber,FaceValue,ETF Underlying,Underlying Key
                NIFTYBEES,Nifty 50,NIPINDETFNIFTYBEES,08-Jan-02,1,INF204KB14I2,1,EQUITY,Nifty 50
                """);
        assertArrayEquals(new String[] {"INF204KB14I2", "NIFTYBEES", "NIFTYBEES · Nifty 50 ETF"}, etf.getFirst());
    }

    @Test
    void parsesAmfiNavFileWithBothIsinColumns() {
        List<String[]> mf = ReferenceIndex.parseAmfi("""
                Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date

                Open Ended Schemes(Equity Scheme - Flexi Cap Fund)

                122639;INF879O01027;-;Parag Parikh Flexi Cap Fund - Direct Plan - Growth;Direct;Growth;92.1;06-Nov-2026
                118968;INF209K01VA3;INF209K01VB1;Aditya Birla SL Frontline Equity - IDCW;Regular;IDCW;55.2;06-Nov-2026
                """);
        assertEquals(3, mf.size());
        assertArrayEquals(new String[] {"INF879O01027", "122639", "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"}, mf.getFirst());
        assertEquals("118968", mf.get(2)[1]);
    }

    @Test
    void parsesMfapiFallbackList() throws Exception {
        List<String[]> mf = ReferenceIndex.parseMfapi("""
                [{"schemeCode":100027,"schemeName":"Old fund","isinGrowth":null,"isinDivReinvestment":null},
                 {"schemeCode":122639,"schemeName":"Parag Parikh Flexi Cap Fund - Direct Plan - Growth","isinGrowth":"INF879O01027","isinDivReinvestment":null}]
                """);
        assertEquals(1, mf.size());
        assertArrayEquals(new String[] {"INF879O01027", "122639", "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"}, mf.getFirst());
    }
}
