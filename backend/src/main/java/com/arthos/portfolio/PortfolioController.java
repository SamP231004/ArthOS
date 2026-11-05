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
            @Size(max = 200) String note) {}

    /** Create (with the first purchase) or update a holding. Class-specific fields are validated in code. */
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
        List<Holding> list = holdings.findByUserIdOrderByCreatedAtAsc(userId);
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
        return single(holdings.save(h));
    }

    @DeleteMapping("/holdings/{id}/lots/{lotId}")
    PortfolioView.HoldingView deleteLot(@PathVariable String id, @PathVariable String lotId) {
        Holding h = load(id);
        if (h.getLots().stream().noneMatch(l -> lotId.equals(l.getId()))) throw ApiException.notFound("Transaction");
        if (h.getLots().size() == 1) throw ApiException.badRequest("A holding needs at least one transaction — delete the holding instead");
        h.getLots().removeIf(l -> lotId.equals(l.getId()));
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
        return new Holding.Lot(UUID.randomUUID().toString(), r.type(), r.date(), r.quantity(), r.price(), blank(r.note()));
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
