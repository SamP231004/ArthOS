package com.arthos.category;

import java.util.ArrayList;
import java.util.List;

/**
 * A user's own take on the category lists, stored on their account. Only differences from the defaults are kept:
 * renamed or hidden built-ins, and the categories they added. A missing entry means "the built-in, as shipped".
 */
public class CategoryPrefs {

    /** One built-in override or one user-added category. */
    public static class Entry {
        private String key;
        private String label;
        private String emoji;
        private boolean hidden;
        /** True for categories the user added (they can be deleted); false for an override of a built-in. */
        private boolean custom;

        public Entry() {}

        public Entry(String key, String label, String emoji, boolean hidden, boolean custom) {
            this.key = key;
            this.label = label;
            this.emoji = emoji;
            this.hidden = hidden;
            this.custom = custom;
        }

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public String getEmoji() { return emoji; }
        public void setEmoji(String emoji) { this.emoji = emoji; }
        public boolean isHidden() { return hidden; }
        public void setHidden(boolean hidden) { this.hidden = hidden; }
        public boolean isCustom() { return custom; }
        public void setCustom(boolean custom) { this.custom = custom; }
    }

    private List<Entry> expense = new ArrayList<>();
    private List<Entry> income = new ArrayList<>();

    public List<Entry> getExpense() { return expense; }
    public void setExpense(List<Entry> expense) { this.expense = expense; }
    public List<Entry> getIncome() { return income; }
    public void setIncome(List<Entry> income) { this.income = income; }

    public List<Entry> of(CategoryKind kind) {
        List<Entry> list = kind == CategoryKind.EXPENSE ? expense : income;
        if (list == null) {
            list = new ArrayList<>();
            if (kind == CategoryKind.EXPENSE) expense = list;
            else income = list;
        }
        return list;
    }
}
