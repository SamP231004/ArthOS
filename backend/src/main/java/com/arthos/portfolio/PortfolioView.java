package com.arthos.portfolio;

import com.arthos.portfolio.Holding.AssetClass;
import com.arthos.portfolio.Holding.BondType;
import com.arthos.portfolio.Holding.GoldForm;
import com.arthos.portfolio.Holding.GoldPurity;
import com.arthos.portfolio.Holding.Horizon;
import com.arthos.portfolio.Holding.LotType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Everything the Investments screen needs in one payload (blueprint §9). Money in INR; percentages as 0–100. */
public record PortfolioView(
        Totals totals,
        List<ClassSlice> allocation,
        List<HorizonSlice> byHorizon,
        List<HoldingView> holdings,
        List<HistoryPoint> history,
        String range,
        /** Oldest live price time among holdings (for "prices as of"). */
        Instant pricesAsOf,
        List<String> priceNotes) {

    public record Totals(BigDecimal value, BigDecimal invested, BigDecimal gain, BigDecimal gainPct,
                         BigDecimal dayChange, BigDecimal dayChangePct, BigDecimal realizedGain, BigDecimal xirr,
                         int holdingsCount) {}

    public record ClassSlice(AssetClass assetClass, BigDecimal value, BigDecimal invested, BigDecimal gain,
                             BigDecimal gainPct, BigDecimal share, int count) {}

    public record HorizonSlice(Horizon horizon, BigDecimal value, BigDecimal share, int count) {}

    public record HistoryPoint(LocalDate date, BigDecimal value, BigDecimal invested) {}

    public enum PriceSource { LIVE, MANUAL, FACE_VALUE, COST }

    public record LotView(String id, LotType type, LocalDate date, BigDecimal quantity, BigDecimal price, BigDecimal amount, String note) {}

    public record GoldInfo(GoldForm form, GoldPurity purity, BigDecimal grams, BigDecimal pricePerGram24k) {}

    public record BondInfo(BigDecimal faceValue, BigDecimal couponRate, LocalDate maturityDate, BondType bondType,
                           BigDecimal annualCoupon, LocalDate nextCouponDate, BigDecimal yearsToMaturity,
                           BigDecimal currentYield) {}

    public record HoldingView(
            String id, AssetClass assetClass, String name, String symbol, String exchange,
            BigDecimal quantity, BigDecimal avgCost, BigDecimal invested,
            BigDecimal price, PriceSource priceSource, Instant priceAsOf, BigDecimal previousClose,
            BigDecimal currentValue, BigDecimal gain, BigDecimal gainPct,
            BigDecimal dayChange, BigDecimal dayChangePct, BigDecimal realizedGain, BigDecimal xirr,
            BigDecimal share, String goal, Horizon horizon, BigDecimal manualPrice, String notes,
            LocalDate firstBought, GoldInfo gold, BondInfo bond, List<BigDecimal> spark, List<LotView> lots) {}
}
