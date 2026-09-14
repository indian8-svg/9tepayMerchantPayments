const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/MerchantDashboard.tsx', 'utf8');

// 1. Add imports
const importsTarget = `import { CustomersManager } from './CustomersManager';`;
const importsAddition = `\nimport { InvoicesManager } from './InvoicesManager';\nimport { SubscriptionsManager } from './SubscriptionsManager';\nimport { SplitPaymentsManager } from './SplitPaymentsManager';`;
content = content.replace(importsTarget, importsTarget + importsAddition);

// 2. Add icons
const iconsTarget = `EyeOff,\n} from 'lucide-react';`;
content = content.replace(iconsTarget, `EyeOff, FileText, Repeat, Route,\n} from 'lucide-react';`);

// 3. Add to state
const stateTarget = `const [activeTab, setActiveTab] = useState<'transactions' | 'customers' | 'orders' | 'banks' | 'security' | 'analytics' | 'api' | 'webhooks' | 'settings'>('transactions');`;
const stateReplacement = `const [activeTab, setActiveTab] = useState<'transactions' | 'customers' | 'invoices' | 'subscriptions' | 'routing' | 'orders' | 'banks' | 'security' | 'analytics' | 'api' | 'webhooks' | 'settings'>('transactions');`;
content = content.replace(stateTarget, stateReplacement);

// 4. Add Buttons to Nav Bar
// Find the exact line: <span>Customers</span>
// It is inside a button. We will append the other buttons after that button's closing tag.
const buttonTarget = `<span>Customers</span>\n            </button>`;
const buttonAddition = `
            <button
              onClick={() => setActiveTab('invoices')}
              className={\`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 \${
                activeTab === 'invoices'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }\`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={\`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 \${
                activeTab === 'subscriptions'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }\`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Subscriptions</span>
            </button>
            <button
              onClick={() => setActiveTab('routing')}
              className={\`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 \${
                activeTab === 'routing'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }\`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Routing Rules</span>
            </button>`;
content = content.replace(buttonTarget, buttonTarget + buttonAddition);

// 5. Add Component Blocks
const componentTarget = `{activeTab === 'customers' && (
          <CustomersManager orders={orders} />
        )}`;
const componentAddition = `
        {activeTab === 'invoices' && (
          <InvoicesManager />
        )}
        {activeTab === 'subscriptions' && (
          <SubscriptionsManager />
        )}
        {activeTab === 'routing' && (
          <SplitPaymentsManager />
        )}`;
content = content.replace(componentTarget, componentTarget + componentAddition);

fs.writeFileSync('frontend/src/components/MerchantDashboard.tsx', content);
