package com.arthos.category;

import com.arthos.common.ApiException;
import com.arthos.user.User;
import com.arthos.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CategoryServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final CategoryService svc = new CategoryService(users, mock(MongoTemplate.class));
    private final User u = new User();

    @BeforeEach
    void setUp() {
        u.setId("u1");
        when(users.findById("u1")).thenReturn(Optional.of(u));
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void defaultsAreTheBuiltIns() {
        var list = svc.list(u, CategoryKind.EXPENSE);
        assertEquals(15, list.size());
        assertEquals("Personal care", list.stream().filter(v -> v.key().equals("PERSONAL_CARE")).findFirst().orElseThrow().label());
        assertEquals("EMI", list.stream().filter(v -> v.key().equals("EMI")).findFirst().orElseThrow().label());
    }

    @Test
    void ownCategoriesGetReadableUniqueKeys() {
        assertEquals("PETS", svc.create("u1", CategoryKind.EXPENSE, "Pets", "🐶").key());
        assertEquals("KIDS_SCHOOL", svc.create("u1", CategoryKind.EXPENSE, "Kids & school", null).key());
        assertThrows(ApiException.class, () -> svc.create("u1", CategoryKind.EXPENSE, "pets", null)); // same name
        assertThrows(ApiException.class, () -> svc.create("u1", CategoryKind.EXPENSE, "Food", null)); // a built-in's name
        svc.requireValid("u1", CategoryKind.EXPENSE, "PETS");
        assertThrows(ApiException.class, () -> svc.requireValid("u1", CategoryKind.INCOME, "PETS")); // other list
    }

    @Test
    void builtInsCanBeRenamedAndHiddenButOtherStays() {
        svc.update("u1", CategoryKind.EXPENSE, "FOOD", "Eating out", null, null);
        svc.update("u1", CategoryKind.EXPENSE, "EDUCATION", null, null, true);
        var food = svc.list(u, CategoryKind.EXPENSE).stream().filter(v -> v.key().equals("FOOD")).findFirst().orElseThrow();
        assertEquals("Eating out", food.label());
        assertTrue(svc.list(u, CategoryKind.EXPENSE).stream().filter(v -> v.key().equals("EDUCATION")).findFirst().orElseThrow().hidden());
        assertEquals("Eating out", svc.labels(u).get("FOOD"));
        assertThrows(ApiException.class, () -> svc.update("u1", CategoryKind.EXPENSE, "OTHER", null, null, true));
        // back to the shipped name leaves no override behind
        svc.update("u1", CategoryKind.EXPENSE, "FOOD", "Food", null, null);
        assertNull(svc.labels(u).get("FOOD"));
    }

    @Test
    void builtInsCanNotBeDeleted() {
        assertThrows(ApiException.class, () -> svc.delete("u1", CategoryKind.EXPENSE, "FOOD", "OTHER"));
    }
}
