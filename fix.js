const fs = require('fs');

let content = fs.readFileSync('src/components/ToolsHub.tsx', 'utf8');

// 1. Add back button to basicCalc
content = content.replace(
    /<div className=\{\s*cardClass\s*\}>\s*<div className="flex justify-between items-center mb-6">\s*<h3 className="font-bold text-2xl flex items-center gap-2">\s*<Calculator className="text-indigo-500" size=\{24\} \/>\s*Calculator\s*<\/h3>\s*<\/div>/,
    <div className={cardClass}>\n<div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">\n<button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">\n<ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />\n</button>\n<h3 className="font-bold text-xl flex items-center gap-2">\n<Calculator className="text-indigo-500" size={24} />\nCalculator\n</h3>\n</div>\n<div className="flex-1 overflow-y-auto p-4 flex flex-col">
);
// We also need to close this new <div className="flex-1 overflow-y-auto p-4 flex flex-col"> in basicCalc.
// basicCalc ends before case 'invoice':
content = content.replace(
    /<\/div>\s*\}\s*case 'invoice':/g,
    '</div>\n</div>\n            }\n            case \'invoice\':'
);

// 2. Add back button to invoice
content = content.replace(
    /<div className=\{\$\{cardClass\} overflow-y-auto\}>\s*<div className="flex justify-between items-center mb-4 border-b pb-3">\s*<div className="flex items-center gap-2">\s*<FileText className="text-indigo-500" size=\{24\} \/>\s*<div>\s*<h3 className="font-bold text-lg">Invoice Pro<\/h3>\s*<p className="text-xs text-gray-500">#\{invoiceNumber\}<\/p>\s*<\/div>\s*<\/div>/,
    <div className={cardClass}>\n<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">\n<div className="flex items-center gap-3">\n<button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">\n<ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />\n</button>\n<div className="flex items-center gap-2">\n<FileText className="text-indigo-500" size={24} />\n<div>\n<h3 className="font-bold text-lg">Invoice Pro</h3>\n<p className="text-xs text-gray-500">#{invoiceNumber}</p>\n</div>\n</div>\n</div>
);
// Wrap invoice inner content
content = content.replace(
    /Share\s*<\/button>\s*<\/div>\s*<\/div>/,
    'Share</button>\n</div>\n</div>\n<div className="flex-1 overflow-y-auto p-4">'
);
content = content.replace(
    /<\/div>\s*case 'translator':/g,
    '</div>\n</div>\n            case \'translator\':'
);

// 3. Add back button to translator
content = content.replace(
    /case 'translator':\s*return \(\s*<div className=\{cardClass\}>\s*<div className="flex justify-between items-center mb-4">\s*<h3 className="font-bold text-xl flex items-center gap-2">\s*<Languages className="text-pink-500" size=\{24\} \/>\s*AI Translator Pro\s*<\/h3>\s*<\/div>/,
    case 'translator':\nreturn (\n<div className={cardClass}>\n<div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">\n<button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">\n<ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />\n</button>\n<h3 className="font-bold text-xl flex items-center gap-2">\n<Languages className="text-pink-500" size={24} />\nAI Translator Pro\n</h3>\n</div>\n<div className="flex-1 overflow-y-auto p-4 flex flex-col">
);
content = content.replace(
    /<\/div>\s*\);\s*default:/g,
    '</div>\n</div>\n                );\n            default:'
);

// 4. Update the imported separated tools without onBack to have it
content = content.replace(/<StockValueCalculator \/>/g, '<StockValueCalculator isDark={isDark} t={t} onBack={handleBackFromTool} />');
content = content.replace(/<DigitalBusinessCard shopDetails=\{shopDetails\} \/>/g, '<DigitalBusinessCard shopDetails={shopDetails} isDark={isDark} t={t} onBack={handleBackFromTool} />');
content = content.replace(/<NoteMaster t=\{t\} isDark=\{isDark\} initialNoteId=\{initialNoteId\} \/>/g, '<NoteMaster t={t} isDark={isDark} initialNoteId={initialNoteId} onBack={handleBackFromTool} />');

fs.writeFileSync('src/components/ToolsHub.tsx', content);
console.log("Replaced");
