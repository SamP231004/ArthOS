package com.arthos.income;

import com.arthos.auth.CurrentUser;
import com.arthos.common.ApiException;
import com.arthos.common.MonthKey;
import com.arthos.income.IncomeDtos.IncomeRequest;
import com.arthos.income.IncomeDtos.IncomeResponse;
import com.arthos.user.UserZones;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incomes")
public class IncomeController {

    private final IncomeRepository incomes;
    private final UserZones zones;

    public IncomeController(IncomeRepository incomes, UserZones zones) {
        this.incomes = incomes;
        this.zones = zones;
    }

    /** Lists the given month's income ("YYYY-MM"), defaulting to the current month in the user's timezone. */
    @GetMapping
    List<IncomeResponse> list(@RequestParam(required = false) String month) {
        String userId = CurrentUser.id();
        String key = MonthKey.parseOrCurrent(month, zones.of(userId)).toString();
        return incomes.findByUserIdAndMonthKeyOrderByDateDescCreatedAtDesc(userId, key)
                .stream().map(IncomeResponse::from).toList();
    }

    @GetMapping("/{id}")
    IncomeResponse get(@PathVariable String id) {
        return IncomeResponse.from(load(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    IncomeResponse create(@Valid @RequestBody IncomeRequest req) {
        Income i = new Income();
        i.setUserId(CurrentUser.id());
        apply(i, req);
        return IncomeResponse.from(incomes.save(i));
    }

    @PutMapping("/{id}")
    IncomeResponse update(@PathVariable String id, @Valid @RequestBody IncomeRequest req) {
        Income i = load(id);
        apply(i, req);
        return IncomeResponse.from(incomes.save(i));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) {
        incomes.delete(load(id));
    }

    private Income load(String id) {
        return incomes.findByIdAndUserId(id, CurrentUser.id()).orElseThrow(() -> ApiException.notFound("Income"));
    }

    private static void apply(Income i, IncomeRequest req) {
        i.setAmount(req.amount());
        i.setSource(req.source().trim());
        i.setType(req.type());
        i.setDate(req.date());
        i.setMonthKey(MonthKey.of(req.date()));
        i.setNote(blankToNull(req.note()));
        i.setRecurring(req.recurring());
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
