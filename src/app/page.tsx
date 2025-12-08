import dynamic from 'next/dynamic';

const TelosHouseViewer = dynamic(
  () => import('@/components/TelosHouseViewer'),
  {
    loading: () => (
      <div className="flex items-center justify-center w-full h-screen bg-[#1a1a1a] text-white">
        Loading Telos House...
      </div>
    )
  }
);

export default function Home() {
  return <TelosHouseViewer />;
}
