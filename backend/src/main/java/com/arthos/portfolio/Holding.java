package com.arthos.portfolio;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * One investment (blueprint §9). Quantity and cost come from its dated lots (buys and sells), which is what makes
 * XIRR, realised gains and trend lines possible. Quantity units depend on the class: shares, MF units, grams of
 * gold (1 SGB unit = 1 g), or bonds.
 */
@Document("holdings")
public class Holding {

    public enum AssetClass { STOCK, MUTUAL_FUND, GOLD, BOND }

    /** Time horizon for goal-based views (§9.3). */
    public enum Horizon { SHORT, MEDIUM, LONG }

    public enum GoldForm { DIGITAL, PHYSICAL, SGB }

    public enum GoldPurity {
        K24(new BigDecimal("1.000")), K22(new BigDecimal("0.916"));

        public final BigDecimal factor;

        GoldPurity(BigDecimal factor) {
            this.factor = factor;
        }
    }

    public enum BondType { GOVERNMENT, CORPORATE }

    public enum LotType { BUY, SELL }

    public static class Lot {
        private String id;
        private LotType type;
        private LocalDate date;
        @Field(targetType = FieldType.DECIMAL128)
        private BigDecimal quantity;
        /** Price per unit at the time of the trade. */
        @Field(targetType = FieldType.DECIMAL128)
        private BigDecimal price;
        private String note;

        public Lot() {}

        public Lot(String id, LotType type, LocalDate date, BigDecimal quantity, BigDecimal price, String note) {
            this.id = id;
            this.type = type;
            this.date = date;
            this.quantity = quantity;
            this.price = price;
            this.note = note;
        }

        public String getId() { return id; }
        public LotType getType() { return type; }
        public LocalDate getDate() { return date; }
        public BigDecimal getQuantity() { return quantity; }
        public BigDecimal getPrice() { return price; }
        public String getNote() { return note; }
    }

    @Id
    private String id;
    @Indexed
    private String userId;
    private AssetClass assetClass;
    private String name;
    /** Market symbol: Yahoo ticker for stocks/ETFs (e.g. RELIANCE.NS), AMFI scheme code for funds, XAU for gold. */
    private String symbol;
    private String exchange;
    private List<Lot> lots = new ArrayList<>();

    private String goal;
    private Horizon horizon;

    private GoldForm goldForm;
    private GoldPurity purity;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal faceValue;
    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal couponRate;
    private LocalDate maturityDate;
    private BondType bondType;

    /** Optional price per unit that overrides live pricing (and the only price source for bonds). */
    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal manualPrice;
    private String notes;

    @Indexed(expireAfter = "0s")
    private Instant expiresAt;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public AssetClass getAssetClass() { return assetClass; }
    public void setAssetClass(AssetClass assetClass) { this.assetClass = assetClass; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }
    public List<Lot> getLots() { return lots; }
    public void setLots(List<Lot> lots) { this.lots = lots; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public Horizon getHorizon() { return horizon; }
    public void setHorizon(Horizon horizon) { this.horizon = horizon; }
    public GoldForm getGoldForm() { return goldForm; }
    public void setGoldForm(GoldForm goldForm) { this.goldForm = goldForm; }
    public GoldPurity getPurity() { return purity; }
    public void setPurity(GoldPurity purity) { this.purity = purity; }
    public BigDecimal getFaceValue() { return faceValue; }
    public void setFaceValue(BigDecimal faceValue) { this.faceValue = faceValue; }
    public BigDecimal getCouponRate() { return couponRate; }
    public void setCouponRate(BigDecimal couponRate) { this.couponRate = couponRate; }
    public LocalDate getMaturityDate() { return maturityDate; }
    public void setMaturityDate(LocalDate maturityDate) { this.maturityDate = maturityDate; }
    public BondType getBondType() { return bondType; }
    public void setBondType(BondType bondType) { this.bondType = bondType; }
    public BigDecimal getManualPrice() { return manualPrice; }
    public void setManualPrice(BigDecimal manualPrice) { this.manualPrice = manualPrice; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    /** Key used for market data lookups, or null when the holding has no live price source. */
    public String marketKey() {
        return switch (assetClass) {
            case STOCK, MUTUAL_FUND -> symbol == null ? null : assetClass + ":" + symbol;
            case GOLD -> "GOLD:XAU";
            case BOND -> null;
        };
    }
}
