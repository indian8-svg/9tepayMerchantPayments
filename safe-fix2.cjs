const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/MerchantDashboard.tsx', 'utf8');

// 1. Add imports
content = content.replace(/import \{ CustomersManager \} from '\.\/CustomersManager';/, `import { CustomersManager } from './CustomersManager';\nimport { InvoicesManager } from './InvoicesManager';\nimport { SubscriptionsManager } from './SubscriptionsManager';\nimport { SplitPaymentsManager } from './SplitPaymentsManager';`);

// 2. Add icons
content = content.replace(/EyeOff,?\s*\} from 'lucide-react';/, `EyeOff, FileText, Repeat, Route,\n} from 'lucide-react';`);

// 3. Add to state
content = content.replace(/useState<'transactions' \| 'customers' \| 'orders' \| 'banks' \| 'security' \| 'analytics' \| 'api' \| 'webhooks' \| 'settings'>/, `useState<'transactions' | 'customers' | 'invoices' | 'subscriptions' | 'routing' | 'orders' | 'banks' | 'security' | 'analytics' | 'api' | 'webhooks' | 'settings'>`);

// 4. Add Buttons to Nav Bar
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

content = content.replace(/(<span>Customers<\/span>\s*<\/button>)/, `$1` + buttonAddition);

// 5. Add Component Blocks
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

content = content.replace(/(\{\s*activeTab === 'customers' && \(\s*<CustomersManager orders=\{orders\} \/>\s*\)\s*\})/, `$1` + componentAddition);

fs.writeFileSync('frontend/src/components/MerchantDashboard.tsx', content);
console.log('Success? ', content.includes('<span>Invoices</span>'));
