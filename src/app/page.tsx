import dynamic from 'next/dynamic';

const TelosHouseViewer = dynamic(
  () => import('@/components/TelosHouseViewer'),
  {
    loading: () => (
      <div className="flex items-center justify-center w-full h-screen bg-[color:var(--color-obsidian)] text-[color:var(--color-parchment)] font-label text-[10px] tracking-widest uppercase">
        ↳ Loading Telos House
      </div>
    ),
  }
);

export default function Home() {
  return <TelosHouseViewer />;
}
