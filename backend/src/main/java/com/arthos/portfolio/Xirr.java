package com.arthos.portfolio;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Extended internal rate of return: the annualised rate r such that Σ cf_i / (1 + r)^(days_i / 365) = 0.
 * Newton–Raphson with a bisection fallback. Outflows (purchases) are negative, inflows (sales, current value) positive.
 */
public final class Xirr {

    public record Flow(LocalDate date, double amount) {}

    private Xirr() {}

    /** Annual rate as a fraction (0.12 = 12%), or null when undefined (e.g. all flows on one day, or no sign change). */
    public static Double of(List<Flow> flows) {
        if (flows.size() < 2) return null;
        boolean pos = flows.stream().anyMatch(f -> f.amount() > 0);
        boolean neg = flows.stream().anyMatch(f -> f.amount() < 0);
        if (!pos || !neg) return null;
        LocalDate t0 = flows.stream().map(Flow::date).min(LocalDate::compareTo).orElseThrow();
        LocalDate t1 = flows.stream().map(Flow::date).max(LocalDate::compareTo).orElseThrow();
        // Under ~a month, annualising produces absurd numbers; callers show simple returns instead.
        if (ChronoUnit.DAYS.between(t0, t1) < 30) return null;

        double r = 0.1;
        for (int i = 0; i < 60; i++) {
            double f = npv(flows, t0, r), d = dnpv(flows, t0, r);
            if (Math.abs(d) < 1e-12) break;
            double next = r - f / d;
            if (Double.isNaN(next) || next <= -0.9999) break;
            if (Math.abs(next - r) < 1e-9) return clamp(next);
            r = next;
        }
        // bisection over a wide but sane range
        double lo = -0.9999, hi = 10;
        double flo = npv(flows, t0, lo), fhi = npv(flows, t0, hi);
        if (flo * fhi > 0) return null;
        for (int i = 0; i < 200; i++) {
            double mid = (lo + hi) / 2, fm = npv(flows, t0, mid);
            if (Math.abs(fm) < 1e-7) return clamp(mid);
            if (flo * fm < 0) {
                hi = mid;
            } else {
                lo = mid;
                flo = fm;
            }
        }
        return clamp((lo + hi) / 2);
    }

    private static double npv(List<Flow> flows, LocalDate t0, double r) {
        double s = 0;
        for (Flow f : flows) s += f.amount() / Math.pow(1 + r, ChronoUnit.DAYS.between(t0, f.date()) / 365.0);
        return s;
    }

    private static double dnpv(List<Flow> flows, LocalDate t0, double r) {
        double s = 0;
        for (Flow f : flows) {
            double t = ChronoUnit.DAYS.between(t0, f.date()) / 365.0;
            s -= t * f.amount() / Math.pow(1 + r, t + 1);
        }
        return s;
    }

    private static Double clamp(double r) {
        return Double.isFinite(r) ? Math.max(-0.9999, Math.min(r, 10)) : null;
    }
}
