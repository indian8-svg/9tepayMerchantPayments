const { Project, SyntaxKind } = require('ts-morph');
const project = new Project();
const sourceFile = project.addSourceFileAtPath('server.ts');

const makeAsync = (functionName) => {
    const fn = sourceFile.getFunction(functionName);
    if (!fn) return;
    fn.setIsAsync(true);
    
    for (const ref of fn.findReferencesAsNodes()) {
        const callExpr = ref.getFirstAncestorByKind(SyntaxKind.CallExpression);
        if (callExpr && callExpr.getExpression().getText() === functionName) {
            if (!callExpr.getParentIfKind(SyntaxKind.AwaitExpression)) {
                callExpr.replaceWithText(`await ${callExpr.getText()}`);
            }
            let func = callExpr.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration);
            if (func) func.setIsAsync(true);
            let arrowFunc = callExpr.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
            if (arrowFunc) arrowFunc.setIsAsync(true);
            let method = callExpr.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);
            if (method) method.setIsAsync(true);
        }
    }
};

makeAsync('selectRoutedBank');
makeAsync('getBankAccountsForUser');
makeAsync('getProfileForUser');

// Replace array/map accesses with queries
// This is complex, but we can do string replacements for the simple ones

sourceFile.copy('server-postgres.ts', { overwrite: true });
project.saveSync();
