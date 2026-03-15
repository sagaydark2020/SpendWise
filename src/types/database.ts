export type Profile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  monthly_budget: number;
  carry_forward_balance: number;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string | null; // null for default categories
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
};

export type SubCategory = {
  id: string;
  category_id: string;
  user_id: string | null;
  name: string;
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  sub_category_id?: string;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
};

export type MonthlyBudget = {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  budget_amount: number;
  actual_spend: number;
  savings: number;
  carried_forward: boolean;
  created_at: string;
};
