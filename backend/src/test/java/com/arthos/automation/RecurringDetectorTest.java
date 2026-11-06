package com.arthos.automation;

import com.arthos.automation.RecurringDetector.Candidate;
import com.arthos.automation.RecurringDetector.Entry;
import com.arthos.automation.RecurringDetector.Kind;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecurringDetectorTest {

    private static Entry e(String name, long amount, int month, int day, boolean recurring) {
        return new Entry(name + month + day, Kind.EXPENSE, name, "UTILITIES", BigDecimal.valueOf(amount), LocalDate.of(2026, month, day), recurring);
    }

    @Test
    void findsMonthlyBillsButNotDailySpendingOrKnownRecurring() {
        List<Entry> list = new ArrayList<>();
        // electricity: once a month, amount drifts a little → candidate
        list.add(e("Electricity bill", 1_800, 8, 11, false));
        list.add(e("Electricity bill", 2_050, 9, 11, false));
        list.add(e("BESCOM electricity bill", 9_999, 9, 12, false)); // different merchant key, one month only → ignored
        list.add(e("Electricity bill", 1_650, 10, 11, false));
        // netflix already marked recurring by the user → not suggested again
        list.add(e("Netflix", 649, 9, 7, true));
        list.add(e("Netflix", 649, 10, 7, false));
        // swiggy: many times a month → not a bill
        for (int m = 8; m <= 10; m++) for (int d = 1; d <= 20; d += 2) list.add(e("Swiggy", 300 + d * 10L, m, d, false));
        // shopping on the same site with wildly different amounts → not recurring
        list.add(e("Amazon", 499, 8, 3, false));
        list.add(e("Amazon", 4_800, 9, 3, false));

        List<Candidate> c = RecurringDetector.detect(list);
        assertEquals(1, c.size(), () -> "got " + c);
        Candidate bill = c.getFirst();
        assertEquals("electricity bill", bill.key());
        assertEquals(3, bill.months());
        assertEquals(0, BigDecimal.valueOf(1_800).compareTo(bill.typicalAmount()));
        assertEquals(LocalDate.of(2026, 10, 11), bill.lastDate());
        assertEquals(11, bill.dayOfMonth());
    }
}
