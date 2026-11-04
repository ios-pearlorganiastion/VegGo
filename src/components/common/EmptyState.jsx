import React from 'react';
import { Users } from 'lucide-react';

function EmptyState({
  icon: Icon = Users,
  title = 'No records found',
  description = 'There are currently no records in the selected category.',
  actionText,
  onAction,
  className = ''
}) {
  return (
    <div className={`w-full py-16 px-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center text-center ${className}`}>
      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Icon size={28} />
      </div>

      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
        {title}
      </h3>

      <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default React.memo(EmptyState);
