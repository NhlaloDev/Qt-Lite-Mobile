export interface ExpenseType {
  id: string;
  name: string;
  amount: string;
  percentage: string;
}

export interface IncomeType {
  id: string;
  name: string;
  amount: string;
}
export interface TaskType {
    id: string;
    name: string;
    due: string;
    budget: number;
    spent: number;
    targetType: string;
    target: number;
    status: number;
  };
