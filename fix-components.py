import re
with open("frontend/src/components/MerchantDashboard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

replacement = """{/* TAB 1B: Customer Directory */}
        {activeTab === \"customers\" && (
          <CustomersManager orders={orders} />
        )}

        {/* TAB 1C: Invoices */}
        {activeTab === \"invoices\" && (
          <InvoicesManager />
        )}
        
        {/* TAB 1D: Subscriptions */}
        {activeTab === \"subscriptions\" && (
          <SubscriptionsManager />
        )}
        
        {/* TAB 1E: Routing */}
        {activeTab === \"routing\" && (
          <SplitPaymentsManager />
        )}"""

regex = r"\{\/\* TAB 1B: Customer Directory \*\/}\s*\{activeTab === .customers. && \(\s*<CustomersManager orders=\{orders\} \/>\s*\)\}"
c = re.sub(regex, replacement, c)

with open("frontend/src/components/MerchantDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(c)

