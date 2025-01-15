import React, { useEffect, useState } from "react";
import axios from "axios";
// 만약 AuthContext에서 user 정보를 가져온다면:
import { useAuth } from "../context/AuthContext";

function Ideawall() {
  const [publicSessions, setPublicSessions] = useState<any[]>([]); // 공개 세션 목록 상태
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태

  // --- (예시) 현재 사용자 정보 가져오기 ---
  const { user } = useAuth();

  // 공개 세션 가져오기
  const fetchPublicSessions = async () => {
    try {
      setLoading(true);
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
        user_username: user.username, // 로그인한 사용자 이름
        friend_username: friendName,  // 공개 세션 주인 이름
      });
      alert(`친구 요청을 보냈습니다: ${friendName}`);
    } catch (err) {
      console.error("친구 요청 실패:", err);
      alert("친구 요청을 보내는 데 실패했습니다.");
    }
  };

  // --- "세션 가져오기" (복제) 함수 ---
  const handleCloneSession = async (session: any) => {
    try {
      if (!user?.id) {
        alert("로그인이 필요합니다.");
        return;
      }

      // 1) 현재 내 user.id 로 '현재 최대 세션 ID' 조회
      const maxRes = await axios.get(
        `http://13.209.75.24:3000/brainstorm/max/${user.id}`
      );
      const currentMaxSessionId = maxRes.data?.session_id ?? 0;
      const newSessionId = currentMaxSessionId + 1;

      // 2) 친구 세션의 user_id
      //    (백엔드 응답으로 session.user_id가 내려온다고 가정)
      const friendUserId = session.user_id;
      console.log("세션 정보:", session);
      if (!friendUserId) {
        return alert("해당 세션 정보에 friend_user_id(또는 user_id)가 없습니다.");
      }

      // 3) 친구 세션 노드 정보 가져오기
      //    GET /brainstorm/get_my_node_by_session/:friendUserId/:session_id
      //    (여기서 session.id를 session.session_id로 쓰거나, 백엔드 응답에 맞춰 수정)
      const nodeRes = await axios.get(
        `http://13.209.75.24:3000/brainstorm/get_my_node_by_session/${friendUserId}/${session.session_id}`
      );
      // nodeRes.data = { session: {...}, nodes: [...] }
      const friendSessionData = nodeRes.data.session;
      const friendNodes = nodeRes.data.nodes || [];

      // 4) 노드 배열에서 session_id만 새 세션 번호로 교체
      const copiedNodes = friendNodes.map((node: any) => ({
        ...node,
        session_id: newSessionId,
      }));

      // 5) 서버에 보낼 JSON 형식
      const requestBody = {
        session_id: newSessionId,
        user_id: user.id, // 내 user_id
        visibility: friendSessionData.visibility || "public",
        nodes: copiedNodes,
      };

      // 6) POST /brainstorm/save_session_with_nodes
      await axios.post(
        "http://13.209.75.24:3000/brainstorm/save_session_with_nodes",
        requestBody
      );

      alert("세션을 성공적으로 가져왔습니다!");
    } catch (error) {
      console.error("세션 가져오기(복제) 실패:", error);
      alert("세션을 가져오는 데 실패했습니다.");
    }
  };

  return (
    // 전체 배경
    <div className="min-h-screen bg-gray-100">
      {/* 상단 메뉴 영역 */}
      <div className="bg-gray-100 px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          {/* 공개 세션 새로고침 버튼 */}
          <button
            className="bg-customGray text-white px-3 py-2 rounded-lg hover:bg-green-600"
            onClick={fetchPublicSessions}
          >
            공개 세션 새로고침
          </button>
          {/* 필요한 다른 메뉴 버튼이나 요소들 */}
        </div>
      </div>

      {/* 실제 콘텐츠 영역 */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-lg font-bold mb-4">공개 세션</h2>

        {loading ? (
          <p className="text-gray-500">로딩 중...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : publicSessions.length === 0 ? (
          <p className="text-gray-500">공개 세션이 없습니다.</p>
        ) : (
          // 2열 그리드 (필요 시 반응형으로 cols 개수를 조절)
          <ul className="grid grid-cols-2 gap-x-0 gap-y-4">
            {publicSessions.map((session: any) => (
              <li
                key={session.session_id}
                className="flex flex-col justify-between bg-white rounded-lg p-4 shadow-md max-w-md mx-auto w-full"
              >
                {/* 세션 정보 영역 */}
                <div>
                  <h3 className="text-md font-bold">
                    {session.session_title?.trim() || "NONE TITLE"}
                  </h3>
                  <p className="text-gray-600">
                    공개 범위: {session.visibility}
                  </p>
                  <div className="text-sm text-gray-500">
                    작성자 : {session.owner} | 작성일:{" "}
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex space-x-2 mt-3 self-end">
                  {/* 친구 추가 버튼 */}
                  <button
                    onClick={() => handleAddFriend(session.owner)}
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600"
                  >
                    친구 추가
                  </button>

                  {/* 세션 가져오기 버튼 */}
                  <button
                    onClick={() => handleCloneSession(session)}
                    className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600"
                  >
                    세션 가져오기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Ideawall;
