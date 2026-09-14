const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/MerchantDashboard.tsx', 'utf8');

// 1. Add useEffect
c = c.replace(/import React, \{ useState \} from 'react';/, `import React, { useState, useEffect } from 'react';`);

// 2. Replace activeTab
const targetState = `const [activeTab, setActiveTab] = useState<'transactions' | 'customers' | 'invoices' | 'subscriptions' | 'routing' | 'orders' | 'banks' | 'security' | 'analytics' | 'api' | 'webhooks' | 'settings'>('transactions');`;

const replacementState = `type TabType = 'transactions' | 'customers' | 'invoices' | 'subscriptions' | 'routing' | 'orders' | 'banks' | 'security' | 'analytics' | 'api' | 'webhooks' | 'settings';
  
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '') as TabType;
    const validTabs = ['transactions', 'customers', 'invoices', 'subscriptions', 'routing', 'orders', 'banks', 'security', 'analytics', 'api', 'webhooks', 'settings'];
    return validTabs.includes(hash) ? hash : 'transactions';
  });

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.history.pushState(null, '', \`#\${activeTab}\`);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      const validTabs = ['transactions', 'customers', 'invoices', 'subscriptions', 'routing', 'orders', 'banks', 'security', 'analytics', 'api', 'webhooks', 'settings'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('transactions');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);`;

c = c.replace(targetState, replacementState);
fs.writeFileSync('frontend/src/components/MerchantDashboard.tsx', c);
