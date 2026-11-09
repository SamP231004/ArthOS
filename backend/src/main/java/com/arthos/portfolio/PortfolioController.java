package com.arthos.portfolio;

import com.arthos.auth.CurrentUser;
import com.arthos.common.ApiException;
import com.arthos.market.MarketDataService;
import com.arthos.portfolio.Holding.*;
import com.arthos.user.UserContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class PortfolioController {

    private static final Set<String> RANGES = Set.of("1M", "3M", "6M", "1Y", "ALL");

    public record LotRequest(
            @NotNull LotType type,
            @NotNull @PastOrPresent LocalDate date,
            @NotNull @DecimalMin(value = "0.000001", message = "must be greater than 0") BigDecimal quantity,
            @NotNull @DecimalMin(value = "0", message = "can't be negative") BigDecimal price,
            @Size(max = 200) String note,
            /** Buys only: SAVINGS (default) or SPENDING. */
            FundingSource fundedFrom,
            /**
             * Buys only: how much of the cost came from the savings account; the rest is spending money. Overrides
             * fundedFrom when given (0 = all spending, the full cost = all savings).
             */
            @DecimalMin(value = "0", message = "can't be negative") BigDecimal fromSavings) {}

    /** Create (with the first purchase) or update a holding. Class-specific fields are validated in code. */
    /** One transaction from an imported file (already matched to an instrument on the user's device). */
    public record ImportLot(
            @NotNull LotType type,
            @NotNull @PastOrPresent LocalDate date,
            @NotNull @DecimalMin(value = "0.000001", message = "must be greater than 0") BigDecimal quantity,
            @NotNull @DecimalMin(value = "0", message = "can't be negative") BigDecimal price) {}

    public record ImportItem(
            @NotNull AssetClass assetClass,
            @NotBlank @Size(max = 140) String name,
            @NotBlank @Size(max = 40) String symbol,
            @Size(max = 12) String isin,
            @NotEmpty @Size(max = 2000) List<@Valid ImportLot> lots) {}

    /**
     * Holdings parsed from a broker export or CAS on the user's device. The file itself never reaches the server: only
     * these confirmed holdings do, exactly as if they had been added by hand.
     */
    public record ImportRequest(
            @NotBlank @Pattern(regexp = "[A-Z_]{2,40}") String source,
            @NotEmpty @Size(max = 500) List<@Valid ImportItem> items) {}

    public record ImportResult(int created, int updated, int transactions, List<Skipped> skipped) {
        public record Skipped(String name, String reason) {}
    }

    public record HoldingRequest(
            @NotNull AssetClass assetClass,
            @NotBlank @Size(max = 140) String name,
            @Size(max = 40) String symbol,
            @Size(max = 20) String exchange,
            @Size(max = 60) String goal,
            Horizon horizon,
            GoldForm goldForm,
            GoldPurity purity,
            @DecimalMin("0.01") BigDecimal faceValue,
            @DecimalMin("0") @DecimalMax("50") BigDecimal couponRate,
            LocalDate maturityDate,
            BondType bondType,
            @DecimalMin("0") BigDecimal manualPrice,
            @Size(max = 500) String notes,
            /** Required on create; ignored on update (use the lots endpoints). */
            @Valid LotRequest firstLot) {}

    private final HoldingRepository holdings;
    private final MarketDataService market;
    private final UserContext userCtx;

    public PortfolioController(HoldingRepository holdings, MarketDataService market, UserContext userCtx) {
        this.holdings = holdings;
        this.market = market;
        this.userCtx = userCtx;
    }

    @GetMapping("/portfolio")
    PortfolioView portfolio(@RequestParam(defaultValue = "1Y") String range) {
        if (!RANGES.contains(range)) throw ApiException.badRequest("range must be one of " + RANGES);
        String userId = CurrentUser.id();
        List<Holding> list = mergeDuplicates(holdings.findByUserIdOrderByCreatedAtAsc(userId));
        List<String> keys = list.stream().map(Holding::marketKey).filter(Objects::nonNull).distinct().toList();
        return PortfolioCalculator.calculate(list, market.quotes(keys), market.histories(keys), LocalDate.now(userCtx.zone(userId)), range);
    }

    @PostMapping("/holdings")
    @ResponseStatus(HttpStatus.CREATED)
    PortfolioView.HoldingView create(@Valid @RequestBody HoldingRequest req) {
        if (req.firstLot() == null) throw ApiException.badRequest("firstLot is required");
        if (req.firstLot().type() != LotType.BUY) throw ApiException.badRequest("The first transaction must be a purchase");
        Holding h = new Holding();
        h.setUserId(CurrentUser.id());
        apply(h, req);
        // the same instrument already held (e.g. bought again, or on the other exchange): add a transaction to it
        Optional<Holding> existing = holdings.findByUserIdOrderByCreatedAtAsc(h.getUserId()).stream().filter(x -> HoldingIdentity.same(x, h)).findFirst();
        if (existing.isPresent()) {
            Holding e = existing.get();
            e.getLots().add(lot(req.firstLot()));
            if (e.getGoal() == null) e.setGoal(h.getGoal());
            if (e.getHorizon() == null) e.setHorizon(h.getHorizon());
            return single(holdings.save(e));
        }
        h.getLots().add(lot(req.firstLot()));
        h.setExpiresAt(userCtx.demoExpiry(h.getUserId()));
        return single(holdings.save(h));
    }

    @PutMapping("/holdings/{id}")
    PortfolioView.HoldingView update(@PathVariable String id, @Valid @RequestBody HoldingRequest req) {
        Holding h = load(id);
        if (h.getAssetClass() != req.assetClass()) throw ApiException.badRequest("Asset class can't be changed");
        apply(h, req);
        return single(holdings.save(h));
    }

    @DeleteMapping("/holdings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) {
        holdings.delete(load(id));
    }

    @PostMapping("/holdings/{id}/lots")
    @ResponseStatus(HttpStatus.CREATED)
    PortfolioView.HoldingView addLot(@PathVariable String id, @Valid @RequestBody LotRequest req) {
        Holding h = load(id);
        if (req.type() == LotType.SELL) {
            BigDecimal held = held(h, req.date());
            if (req.quantity().compareTo(held) > 0) throw ApiException.badRequest("You only held " + held.stripTrailingZeros().toPlainString() + " on that date");
        }
        h.getLots().add(lot(req));
        checkChronology(h.getLots());
        return single(holdings.save(h));
    }

    /**
     * Import holdings matched on the device from a broker export / CAS. Each instrument joins the user's existing
     * holding of it (or becomes a new one); lots from an earlier import of the same source are replaced, so importing
     * a fresh file updates rather than duplicates. Imported lots never touch the savings account.
     */
    @PostMapping("/holdings/import")
    ImportResult importHoldings(@Valid @RequestBody ImportRequest req) {
        String userId = CurrentUser.id();
        List<Holding> mine = new java.util.ArrayList<>(holdings.findByUserIdOrderByCreatedAtAsc(userId));
        int created = 0, updated = 0, count = 0;
        List<ImportResult.Skipped> skipped = new java.util.ArrayList<>();
        for (ImportItem item : req.items()) {
            if (item.assetClass() != AssetClass.STOCK && item.assetClass() != AssetClass.MUTUAL_FUND) {
                skipped.add(new ImportResult.Skipped(item.name(), "Only stocks, ETFs and mutual funds can be imported"));
                continue;
            }
            Holding probe = new Holding();
            probe.setUserId(userId);
            probe.setAssetClass(item.assetClass());
            probe.setName(item.name().trim());
            probe.setSymbol(item.symbol().trim().toUpperCase(java.util.Locale.ROOT));
            probe.setExchange(item.assetClass() == AssetClass.STOCK ? "NSE" : null);
            Optional<Holding> existing = mine.stream().filter(h -> HoldingIdentity.same(h, probe)).findFirst();
            if (existing.isPresent() && existing.get().getLots().stream().anyMatch(l -> !l.imported())) {
                skipped.add(new ImportResult.Skipped(item.name(), "Already in ArthOS (added by hand), so it was skipped to avoid counting it twice. Delete it first to replace it with the import."));
                continue;
            }
            Holding target = existing.orElse(probe);
            List<Holding.Lot> before = new java.util.ArrayList<>(target.getLots());
            // a fresh file from the same broker (or an overlapping statement) replaces the earlier import
            String family = importFamily(req.source());
            target.getLots().removeIf(l -> family.equals(importFamily(l.getImportSource())));
            for (ImportLot il : item.lots()) {
                Holding.Lot l = new Holding.Lot(UUID.randomUUID().toString(), il.type(), il.date(), il.quantity(), il.price(), "Imported");
                l.setImportSource(req.source());
                target.getLots().add(l);
            }
            try {
                if (target.getLots().isEmpty() || target.getLots().stream().noneMatch(l -> l.getType() == LotType.BUY))
                    throw ApiException.badRequest("No purchases to import");
                checkChronology(target.getLots());
            } catch (ApiException e) {
                target.getLots().clear();
                target.getLots().addAll(before);
                skipped.add(new ImportResult.Skipped(item.name(), e.getMessage()));
                continue;
            }
            if (existing.isEmpty()) {
                target.setExpiresAt(userCtx.demoExpiry(userId));
                mine.add(holdings.save(target));
                created++;
            } else {
                holdings.save(target);
                updated++;
            }
            count += item.lots().size();
        }
        return new ImportResult(created, updated, count, skipped);
    }

    /**
     * Imports that describe the same holdings: Zerodha's holdings and tradebook exports, and a Groww MF statement vs a
     * CAS (which already includes Groww's funds). Different brokers are separate shares, so they add up.
     */
    static String importFamily(String source) {
        if (source == null) return "";
        if (source.startsWith("ZERODHA")) return "ZERODHA";
        if (source.equals("CAS") || source.equals("GROWW_MF")) return "MUTUAL_FUNDS";
        return source;
    }

    /** Edit a transaction: quantity, price/NAV, date, type and how it was paid for. */
    @PutMapping("/holdings/{id}/lots/{lotId}")
    PortfolioView.HoldingView updateLot(@PathVariable String id, @PathVariable String lotId, @Valid @RequestBody LotRequest req) {
        Holding h = load(id);
        Holding.Lot l = h.getLots().stream().filter(x -> lotId.equals(x.getId())).findFirst().orElseThrow(() -> ApiException.notFound("Transaction"));
        Holding.Lot edited = lot(req);
        l.setType(edited.getType());
        l.setDate(edited.getDate());
        l.setQuantity(edited.getQuantity());
        l.setPrice(edited.getPrice());
        l.setNote(edited.getNote());
        l.setFundedFrom(edited.getFundedFrom());
        l.setSavingsAmount(edited.getSavingsAmount());
        if (h.getLots().stream().noneMatch(x -> x.getType() == LotType.BUY)) throw ApiException.badRequest("A holding needs at least one purchase");
        checkChronology(h.getLots());
        return single(holdings.save(h));
    }

    @DeleteMapping("/holdings/{id}/lots/{lotId}")
    PortfolioView.HoldingView deleteLot(@PathVariable String id, @PathVariable String lotId) {
        Holding h = load(id);
        if (h.getLots().stream().noneMatch(l -> lotId.equals(l.getId()))) throw ApiException.notFound("Transaction");
        if (h.getLots().size() == 1) throw ApiException.badRequest("A holding needs at least one transaction — delete the holding instead");
        h.getLots().removeIf(l -> lotId.equals(l.getId()));
        checkChronology(h.getLots());
        return single(holdings.save(h));
    }

    // ------------------------------------------------------------------

    private PortfolioView.HoldingView single(Holding h) {
        String k = h.marketKey();
        List<String> keys = k == null ? List.of() : List.of(k);
        PortfolioView v = PortfolioCalculator.calculate(List.of(h), market.quotes(keys), market.histories(keys),
                LocalDate.now(userCtx.zone(h.getUserId())), "1M");
        return v.holdings().getFirst();
    }

    private Holding load(String id) {
        return holdings.findByIdAndUserId(id, CurrentUser.id()).orElseThrow(() -> ApiException.notFound("Holding"));
    }

    private static Holding.Lot lot(LotRequest r) {
        Holding.Lot l = new Holding.Lot(UUID.randomUUID().toString(), r.type(), r.date(), r.quantity(), r.price(), blank(r.note()));
        if (r.type() != LotType.BUY) return l;
        if (r.fromSavings() != null) {
            // split payment: this much from savings, the rest from spending money
            BigDecimal s = r.fromSavings().max(BigDecimal.ZERO).min(l.cost());
            l.setSavingsAmount(s);
            l.setFundedFrom(s.signum() == 0 ? FundingSource.SPENDING : FundingSource.SAVINGS);
        } else {
            l.setFundedFrom(r.fundedFrom() == null ? FundingSource.SAVINGS : r.fundedFrom());
        }
        return l;
    }

    /** No point in time may have sold more than was held (checked after any add/edit/delete). */
    private static void checkChronology(List<Holding.Lot> lots) {
        List<Holding.Lot> sorted = new java.util.ArrayList<>(lots);
        sorted.sort(java.util.Comparator.comparing(Holding.Lot::getDate).thenComparing(l -> l.getType() == LotType.SELL ? 1 : 0));
        BigDecimal q = BigDecimal.ZERO;
        for (Holding.Lot l : sorted) {
            q = l.getType() == LotType.BUY ? q.add(l.getQuantity()) : q.subtract(l.getQuantity());
            if (q.compareTo(new BigDecimal("-0.000001")) < 0) {
                throw ApiException.badRequest("That would sell more than you held on " + l.getDate() + " — check the quantities and dates");
            }
        }
    }

    /**
     * Older data could hold the same instrument twice (bought again, or once per exchange). Fold each group into its
     * oldest holding — all transactions kept — and remove the copies, so the portfolio shows one row per instrument.
     */
    private List<Holding> mergeDuplicates(List<Holding> list) {
        List<Holding> kept = new java.util.ArrayList<>();
        List<Holding> removed = new java.util.ArrayList<>();
        for (Holding h : list) {
            Optional<Holding> into = kept.stream().filter(k -> HoldingIdentity.same(k, h)).findFirst();
            if (into.isEmpty()) {
                kept.add(h);
                continue;
            }
            Holding k = into.get();
            k.getLots().addAll(h.getLots());
            if (k.getGoal() == null) k.setGoal(h.getGoal());
            if (k.getHorizon() == null) k.setHorizon(h.getHorizon());
            if (k.getNotes() == null) k.setNotes(h.getNotes());
            removed.add(h);
        }
        if (!removed.isEmpty()) {
            holdings.saveAll(kept.stream().filter(k -> removed.stream().anyMatch(r -> HoldingIdentity.same(k, r))).toList());
            holdings.deleteAll(removed);
        }
        return kept;
    }

    private static BigDecimal held(Holding h, LocalDate asOf) {
        BigDecimal q = BigDecimal.ZERO;
        for (Holding.Lot l : h.getLots()) {
            if (l.getDate().isAfter(asOf)) continue;
            q = l.getType() == LotType.BUY ? q.add(l.getQuantity()) : q.subtract(l.getQuantity());
        }
        return q.max(BigDecimal.ZERO);
    }

    private static void apply(Holding h, HoldingRequest r) {
        h.setAssetClass(r.assetClass());
        h.setName(r.name().trim());
        h.setGoal(blank(r.goal()));
        h.setHorizon(r.horizon());
        h.setManualPrice(r.manualPrice());
        h.setNotes(blank(r.notes()));
        h.setExchange(blank(r.exchange()));
        switch (r.assetClass()) {
            case STOCK, MUTUAL_FUND -> {
                if (blank(r.symbol()) == null) throw ApiException.badRequest(r.assetClass() == AssetClass.STOCK
                        ? "Pick a stock from search so we can fetch its price" : "Pick a fund from search so we can fetch its NAV");
                h.setSymbol(r.symbol().trim().toUpperCase(java.util.Locale.ROOT));
            }
            case GOLD -> {
                h.setSymbol("XAU");
                h.setGoldForm(r.goldForm() == null ? GoldForm.DIGITAL : r.goldForm());
                h.setPurity(h.getGoldForm() == GoldForm.SGB ? GoldPurity.K24 : (r.purity() == null ? GoldPurity.K24 : r.purity()));
            }
            case BOND -> {
                if (r.faceValue() == null || r.couponRate() == null || r.maturityDate() == null) {
                    throw ApiException.badRequest("Bonds need a face value, coupon rate and maturity date");
                }
                h.setSymbol(null);
                h.setFaceValue(r.faceValue());
                h.setCouponRate(r.couponRate());
                h.setMaturityDate(r.maturityDate());
                h.setBondType(r.bondType() == null ? BondType.GOVERNMENT : r.bondType());
            }
        }
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
