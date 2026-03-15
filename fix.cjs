const fs = require('fs');

let content = fs.readFileSync('src/components/ToolsHub.tsx', 'utf8');

// Update back buttons for Inline Tools
content = content.replace(
    /<div className=\{cardClass\}>\s*<div className="flex justify-between items-center mb-6">/g,
    \<div className={cardClass}>\\n<div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">\\n<button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} /></button>\
);

content = content.replace(
    /<div className=\{\\\\$\\{cardClass\\} overflow-y-auto\\}>\s*<div className="flex justify-between items-center mb-4 border-b pb-3">/g,
    \<div className={cardClass}>\\n<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">\\n<div className="flex items-center gap-3">\\n<button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} /></button>\
);

content = content.replace(
    /<div className=\{cardClass\}>\s*<div className="flex justify-between items-center mb-4">/g,
    \<div className={cardClass}>\\n<div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">\\n<button onClick={handleBackFromTool} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} /></button>\
);

// We need to inject <div className="p-4 overflow-y-auto flex-1 flex flex-col"> right below the headers
content = content.replace(
    /Calculator\s*<\/h3>\s*<\/div>/g,
    \Calculator</h3></div>\\n<div className="p-4 overflow-y-auto flex-1 flex flex-col">\
);

content = content.replace(
    /AI Translator Pro\s*<\/h3>\s*<\/div>/g,
    \AI Translator Pro</h3></div>\\n<div className="p-4 overflow-y-auto flex-1 flex flex-col">\
);

content = content.replace(
    /<Share2 size=\{16\} \/> Share\s*<\/button>\s*<\/div>\s*<\/div>/g,
    \<Share2 size={16} /> Share</button></div></div>\\n<div className="p-4 overflow-y-auto flex-1 flex flex-col">\
);

// And close them at the end of every block
content = content.replace(/<\/div>\s*\}\s*case 'invoice':/g, '</div></div>}\\ncase \\'invoice\\':');
content = content.replace(/<\/div>\s*case 'translator':/g, '</div></div>\\ncase \\'translator\\':');
content = content.replace(/<\/div>\s*\);\s*default:/g, '</div></div>);\\ndefault:');

// Prop updates
content = content.replace(/<StockValueCalculator \/>/g, '<StockValueCalculator isDark={isDark} t={t} onBack={handleBackFromTool} />');
content = content.replace(/<DigitalBusinessCard shopDetails=\{shopDetails\} \/>/g, '<DigitalBusinessCard shopDetails={shopDetails} isDark={isDark} t={t} onBack={handleBackFromTool} />');
content = content.replace(/<NoteMaster t=\{t\} isDark=\{isDark\} initialNoteId=\{initialNoteId\} \/>/g, '<NoteMaster t={t} isDark={isDark} initialNoteId={initialNoteId} onBack={handleBackFromTool} />');

fs.writeFileSync('src/components/ToolsHub.tsx', content);
console.log("Replaced successfully");
