import React, { useEffect, useState } from "react";
import axios from "axios";
// 만약 AuthContext에서 user 정보를 가져온다면:
import { useAuth } from "../context/AuthContext";

function Ideawall() {
  const [publicSessions, setPublicSessions] = useState([]); // 공개 세션 목록 상태
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태

  // --- (예시) 현재 사용자 정보 가져오기 ---
  const { user } = useAuth();

  // 공개 세션 가져오기
  const fetchPublicSessions = async () => {
    try {
      const response = await axios.get(
        "http://13.209.75.24:3000/brainstorm/public_session",
        { validateStatus: () => true } 
      );

      if (response.data.error) {
        setError(response.data.error);
        setPublicSessions([]);
      } else {
        setPublicSessions(response.data.sessions || []);
        setError(null);
      }
    } catch (err) {
      console.error("공개 세션 가져오기 실패:", err);
      setError("공개 세션을 가져오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 처음 마운트 시 공개 세션 불러오기
  useEffect(() => {
    fetchPublicSessions();
  }, []);

  // --- 친구 추가 버튼 클릭 시 로직 ---
  const handleAddFriend = async (friendName: string) => {
    try {
      if (!user?.username) {
        alert("로그인이 필요합니다."); // 예시
        return;
      }
      if (!friendName) {
        alert("유효하지 않은 친구 이름입니다.");
        return;
      }
      await axios.post("http://13.209.75.24:3000/friends/add", {
        user_username: user.username,  // 로그인한 사용자 이름
        friend_username: friendName,   // 공개 세션 주인 이름
      });
      alert(`친구 요청을 보냈습니다: ${friendName}`);
    } catch (err) {
      console.error("친구 요청 실패:", err);
      alert("친구 요청을 보내는 데 실패했습니다.");
    }
  };

  return (
    <div className="relative bg-gray-100 min-h-screen">
      {/* 상단 메뉴 영역 (connection.tsx와 비슷한 구조) */}
      <div className="flex items-center justify-between bg-gray-100 px-6 py-4 w-2/3 max-w-xl">
        <div className="flex space-x-4">
          <button
            className="bg-customGray text-white px-2 py-2 rounded-lg hover:bg-green-600"
            onClick={fetchPublicSessions}
          >
            공개 세션 새로고침
          </button>
        </div>
      </div>

      {/* 실제 콘텐츠 영역 */}
      <div className="mt-8 bg-gray-100 w-2/3 max-w-xl p-6">
        <h2 className="text-lg font-bold mb-4">공개 세션</h2>
        {loading ? (
          <p className="text-gray-500">로딩 중...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : publicSessions.length === 0 ? (
          <p className="text-gray-500">공개 세션이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {publicSessions.map((session: any) => (
              <li
                key={session.id}
                className="flex justify-between items-center bg-gray-100 rounded-lg p-4 shadow-md"
              >
                {/* 세션 정보 영역 */}
                <div>
                  <h3 className="text-md font-bold">
                    {session.session_title?.trim() || "NONE TITLE"}
                  </h3>
                  <p className="text-gray-600">공개 범위: {session.visibility}</p>
                  <div className="text-sm text-gray-500">
                    작성자 : {session.owner} | 작성일:{" "}
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* 친구 추가 버튼 영역 */}
                <button
                  onClick={() => handleAddFriend(session.owner)}
                  className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                >
                  친구 추가
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Ideawall;
