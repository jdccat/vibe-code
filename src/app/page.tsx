'use client'

import { useState, useEffect } from 'react'
import { ref, onValue, push, runTransaction } from 'firebase/database'
import { database } from '@/lib/firebase'

interface Comment {
  id?: string;
  text: string;
  timestamp: string; // 그냥 문자열로 저장/관리
}

export default function Home() {
  const [votes, setVotes] = useState({
    yes: 0,
    no: 0
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')

  // Firebase에서 데이터 로드
  useEffect(() => {
    const votesRef = ref(database, 'votes');
    const commentsRef = ref(database, 'comments');

    // 투표 데이터 구독
    onValue(votesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVotes(data);
      }
    });

    // 방명록(댓글) 데이터 구독 - key 기준 내림차순(최신순) 정렬
    onValue(commentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const commentsArray = Object.entries(data)
          .sort((a, b) => b[0].localeCompare(a[0])) // key 기준 내림차순
          .map(([id, comment]) => ({
            id,
            text: (comment as { text: string }).text,
            timestamp: (comment as { timestamp: string }).timestamp // 표기용
          }));
        setComments(commentsArray);
      } else {
        setComments([]);
      }
    });
  }, []);

  // 투표 핸들러 (runTransaction 사용)
  const handleVote = (type: 'yes' | 'no') => {
    if (typeof window !== 'undefined' && localStorage.getItem('voted')) {
      alert('이미 투표하셨습니다.');
      return;
    }
    const votesRef = ref(database, 'votes');
    runTransaction(votesRef, (currentVotes) => {
      if (!currentVotes) {
        return { yes: type === 'yes' ? 1 : 0, no: type === 'no' ? 1 : 0 };
      }
      return {
        yes: type === 'yes' ? (currentVotes.yes || 0) + 1 : currentVotes.yes || 0,
        no: type === 'no' ? (currentVotes.no || 0) + 1 : currentVotes.no || 0,
      };
    })
      .then(() => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('voted', 'true');
        }
      })
      .catch((error) => console.error('투표 저장 에러:', error));
  }

  // 댓글 추가 핸들러
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const newCommentObj = {
      text: newComment,
      timestamp: new Date().toLocaleString() // 그냥 문자열로 저장
    };

    const commentsRef = ref(database, 'comments');
    push(commentsRef, newCommentObj)
      .then(() => {})
      .catch((error) => console.error('댓글 저장 에러:', error));
    
    setNewComment('')
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white tracking-wider">
          바이브 코딩
        </h1>
        <p className="text-xl text-gray-300 mt-4 mb-6">
          바이브 코딩 할 줄 모르는 사람은 어떻게 될까?
        </p>
        <div className="text-red-500 text-6xl font-bold">VS</div>
      </div>
      
      <div className="space-y-8 w-full max-w-2xl">
        <div className="grid grid-cols-2 gap-8">
          <button
            onClick={() => handleVote('yes')}
            className="p-8 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg"
          >
            <div className="text-3xl font-bold mb-4">잘린다</div>
            <div className="text-4xl font-bold">{votes.yes}표</div>
          </button>

          <button
            onClick={() => handleVote('no')}
            className="p-8 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            <div className="text-3xl font-bold mb-4">안 잘린다</div>
            <div className="text-4xl font-bold">{votes.no}표</div>
          </button>
        </div>

        <div className="text-center text-white text-xl">
          총 투표수: {votes.yes + votes.no}
        </div>

        {/* 방명록 섹션 */}
        <div className="bg-gray-100 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">방명록</h2>
          
          <form onSubmit={handleAddComment} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="의견을 남겨주세요"
                className="flex-1 p-3 border rounded-lg bg-white text-gray-800"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold"
              >
                등록
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-white rounded-lg shadow">
                <div className="text-gray-800">{comment.text}</div>
                <div className="text-xs text-gray-500">{comment.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}