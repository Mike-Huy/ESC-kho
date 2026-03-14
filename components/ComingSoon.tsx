import React from 'react';

interface ComingSoonProps {
  title: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Animated Illustration Container */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl shadow-primary/10 border border-slate-100">
             <span className="material-icons-round text-7xl text-primary animate-bounce">engineering</span>
             <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <span className="material-icons-round text-white text-sm">priority_high</span>
             </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tính năng <span className="text-primary">"{title}"</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
            Chúng tôi đang nỗ lực hoàn thiện module này để mang lại trải nghiệm tốt nhất cho quy trình vận hành của bạn.
          </p>
        </div>

        {/* Progress Info */}
        <div className="max-w-sm mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-slate-700">Tiến độ phát triển</span>
            <span className="text-sm font-extrabold text-primary">75%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-3/4 animate-progress shadow-[0_0_12px_rgba(37,99,235,0.4)]"></div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-amber-600">
             <span className="material-icons-round text-sm">auto_awesome</span>
             <span className="text-xs font-bold uppercase tracking-wider">Sắp ra mắt trong phiên bản mới</span>
          </div>
        </div>

        {/* Support Link */}
        <div className="pt-4">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20">
             <span className="material-icons-round text-sm">headset_mic</span>
             Yêu cầu ưu tiên phát triển
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
