'use client';

import { useRouter } from 'next/navigation';
import TutorialGame from '../../components/TutorialGame';

export default function TutorialPage() {
  const router = useRouter();
  return <TutorialGame onClose={() => router.push('/')} />;
}
