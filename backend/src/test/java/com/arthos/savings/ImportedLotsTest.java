package com.arthos.savings;

import com.arthos.portfolio.Holding;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Investments imported from a broker file were bought before ArthOS: they must not move the savings account. */
class ImportedLotsTest {

    @Test
    void importedLotsProduceNoSavingsOrSpendingFlows() {
        Holding h = new Holding();
        Holding.Lot imported = new Holding.Lot("a", Holding.LotType.BUY, LocalDate.of(2024, 3, 1), new BigDecimal("10"), new BigDecimal("2400"), "Imported");
        imported.setImportSource("ZERODHA_HOLDINGS");
        Holding.Lot importedSale = new Holding.Lot("b", Holding.LotType.SELL, LocalDate.of(2025, 1, 1), new BigDecimal("2"), new BigDecimal("2900"), "Imported");
        importedSale.setImportSource("ZERODHA_TRADEBOOK");
        Holding.Lot manual = new Holding.Lot("c", Holding.LotType.BUY, LocalDate.of(2026, 11, 2), new BigDecimal("1"), new BigDecimal("2500"), null);
        h.getLots().addAll(List.of(imported, importedSale, manual));

        assertEquals(0, imported.fromSavings().signum());
        assertEquals(0, imported.fromSpending().signum());
        List<SavingsAccount.Flow> flows = SavingsService.flows(List.of(h));
        assertEquals(1, flows.size(), "only the manual purchase moves money");
        assertEquals(SavingsAccount.FlowKind.BUY_FROM_SAVINGS, flows.getFirst().kind());
    }
}
