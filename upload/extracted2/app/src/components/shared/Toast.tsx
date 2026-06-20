import { useStore } from '@/store/useStore';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: { id: string; message: string; type: string }; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleRemove = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const styles = {
    success: {
      bg: 'bg-[#F0FDF4]',
      border: 'border-[#BBF7D0]',
      text: 'text-[#166534]',
      icon: <CheckCircle size={18} className="text-[#16A34A]" />,
    },
    error: {
      bg: 'bg-[#FEF2F2]',
      border: 'border-[#FECACA]',
      text: 'text-[#991B1B]',
      icon: <AlertCircle size={18} className="text-[#DC2626]" />,
    },
    info: {
      bg: 'bg-[#EFF6FF]',
      border: 'border-[#BFDBFE]',
      text: 'text-[#1E40AF]',
      icon: <Info size={18} className="text-[#2563EB]" />,
    },
  };

  const style = styles[toast.type as keyof typeof styles] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded border shadow-card-md transition-all duration-300
        ${style.bg} ${style.border} ${style.text}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
