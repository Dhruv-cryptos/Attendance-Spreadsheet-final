import { Bot } from 'lucide-react';
import { useApp } from '@/store/appStore';
import ChatPanel from '@/components/ChatPanel';
import { SectionTitle, Badge } from '@/components/ui';

export default function Assistant() {
  const { dataset, analysis } = useApp();
  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<Bot size={18} />}
        title="Data AI Assistant"
        subtitle="Grounded in the deterministic analysis of your current dataset — facts from the engine, advice from AI."
        right={
          analysis
            ? <Badge tone="green">Context: {dataset?.filename}</Badge>
            : <Badge tone="slate">No dataset loaded</Badge>
        }
      />
      <ChatPanel mode="data" />
    </div>
  );
}
