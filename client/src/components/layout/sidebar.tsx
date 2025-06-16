import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  Calculator, 
  BarChart3, 
  FileSpreadsheet 
} from "lucide-react";

const navigation = [
  { name: "ダッシュボード", href: "/", icon: LayoutDashboard },
  { name: "支出管理", href: "/expenses", icon: Receipt },
  { name: "予算設定", href: "/budgets", icon: Calculator },
  { name: "照合レポート", href: "/reports", icon: BarChart3 },
  { name: "データ管理", href: "/data-management", icon: FileSpreadsheet },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-800">予算管理システム</h1>
        <p className="text-sm text-gray-600 mt-1">ExpenseTracker</p>
      </div>
      <nav className="mt-6">
        <ul className="space-y-2 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}>
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
