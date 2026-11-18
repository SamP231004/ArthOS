package com.arthos.category;

import com.arthos.common.ApiException;
import com.arthos.auth.CurrentUser;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/** The user's expense categories and income types: list, add, rename / hide / change emoji, delete (moving entries). */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    public record Lists(List<CategoryService.View> expense, List<CategoryService.View> income) {}

    public record CreateRequest(@NotBlank @Size(max = 30) String label, @Size(max = 16) String emoji) {}

    public record UpdateRequest(@Size(max = 30) String label, @Size(max = 16) String emoji, Boolean hidden) {}

    private final CategoryService categories;
    private final UserRepository users;

    public CategoryController(CategoryService categories, UserRepository users) {
        this.categories = categories;
        this.users = users;
    }

    @GetMapping
    Lists all() {
        User u = users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        return new Lists(categories.list(u, CategoryKind.EXPENSE), categories.list(u, CategoryKind.INCOME));
    }

    @PostMapping("/{kind}")
    @ResponseStatus(HttpStatus.CREATED)
    CategoryService.View create(@PathVariable String kind, @Valid @RequestBody CreateRequest req) {
        return categories.create(CurrentUser.id(), kind(kind), req.label(), req.emoji());
    }

    @PatchMapping("/{kind}/{key}")
    CategoryService.View update(@PathVariable String kind, @PathVariable String key, @Valid @RequestBody UpdateRequest req) {
        return categories.update(CurrentUser.id(), kind(kind), key, req.label(), req.emoji(), req.hidden());
    }

    /** How many entries are filed under a category (shown before deleting it). */
    @GetMapping("/{kind}/{key}/usage")
    Map<String, Long> usage(@PathVariable String kind, @PathVariable String key) {
        return Map.of("count", categories.usage(CurrentUser.id(), kind(kind), key));
    }

    @DeleteMapping("/{kind}/{key}")
    Map<String, Long> delete(@PathVariable String kind, @PathVariable String key, @RequestParam(required = false) String moveTo) {
        return Map.of("moved", categories.delete(CurrentUser.id(), kind(kind), key, moveTo));
    }

    private static CategoryKind kind(String s) {
        try {
            return CategoryKind.valueOf(s.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("kind must be expense or income");
        }
    }
}
