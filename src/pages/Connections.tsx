import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import add_friends from "../assets/image/add_friends.png";
import request_friends from "../assets/image/request_friend.png";
import axios from "axios";

function Connections() {
  const { user } = useAuth(); // 현재 사용자 정보
  const [friends, setFriends] = useState([]); // 친구 목록
  const [friendRequests, setFriendRequests] = useState([]); // 친구 요청 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태
  const [showAddFriendModal, setShowAddFriendModal] = useState(false); // 친구 추가 모달
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false); // 친구 요청 모달
  const [friendName, setFriendName] = useState(""); // 입력된 친구 이름

  // ▼ 추가된 state들 ▼
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [friendSessions, setFriendSessions] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 친구 목록 가져오기
  const fetchFriends = async () => {
    try {
      const response = await axios.get(
        `http://13.209.75.24:3000/friends/${user.username}/list`
      );
      setFriends(response.data.friends || []);
      setLoading(false);
    } catch (err) {
      console.error("친구 목록 가져오기 실패:", err);
      setError("친구 목록을 가져오는 데 실패했습니다.");
      setLoading(false);
    }
  };

  // 친구 요청 목록 가져오기
  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(
        `http://13.209.75.24:3000/friends/${user.username}/requests`
      );
      setFriendRequests(response.data.friend_requests || []);
      setShowFriendRequestsModal(true);
    } catch (err) {
      console.error("친구 요청 목록 가져오기 실패:", err);
      setError("친구 요청 목록을 가져오는 데 실패했습니다.");
    }
  };

  // 친구 요청 보내기
  const sendFriendRequest = async () => {
    if (!friendName.trim()) {
      alert("친구 이름을 입력해주세요!");
      return;
    }
    try {
      await axios.post("http://13.209.75.24:3000/friends/add", {
        user_username: user.username,
        friend_username: friendName,
      });
      alert(`친구 요청을 보냈습니다: ${friendName}`);
      setFriendName("");
      setShowAddFriendModal(false);
    } catch (err) {
      console.error("친구 요청 실패:", err);
      alert("친구 요청을 보내는 데 실패했습니다.");
    }
  };

  // 친구 요청 응답 처리
  const respondToFriendRequest = async (requester_name, status) => {
    try {
      await axios.put("http://13.209.75.24:3000/friends/respond", {
        user_username: user.username,
        friend_username: requester_name,
        status: status,
      });
      alert(
        status === "accepted"
          ? `${requester_name}의 요청을 수락했습니다.`
          : `${requester_name}의 요청을 거절했습니다.`
      );
      // 처리된 요청 제거
      setFriendRequests((prev) =>
        prev.filter((req) => req.requester_name !== requester_name)
      );
    } catch (err) {
      console.error("친구 요청 응답 실패:", err);
      alert("친구 요청에 응답하는 데 실패했습니다.");
    }
  };

  // 친구 삭제 함수
  const removeFriend = async (friendName) => {
    try {
      await axios.delete("http://13.209.75.24:3000/friends/remove", {
        data: {
          user_username: user.username,
          friend_username: friendName,
        },
      });
      alert(`${friendName}님을 삭제했습니다.`);
      setFriends((prev) =>
        prev.filter((friend) => friend.username !== friendName)
      );
    } catch (err) {
      console.error("친구 삭제 실패:", err);
      alert("친구를 삭제하는 데 실패했습니다.");
    }
  };

  // ▼ 특정 친구 세션 가져오기 ▼
  const handleFetchFriendSessions = async (friendName: string) => {
    if (!user?.username) {
      return alert("로그인이 필요합니다.");
    }
    try {
      setLoadingSessions(true);
      // 예: GET /friends/sessions/:user_username/:friendname
      const res = await axios.get(
        `http://13.209.75.24:3000/friends/sessions/${user.username}/${friendName}`
      );
      setFriendSessions(res.data.sessions || []);
      setSelectedFriend(friendName);
      setShowPanel(true);
    } catch (err) {
      console.error("친구 세션 가져오기 실패:", err);
      alert("세션을 가져오는 데 실패했습니다.");
    } finally {
      setLoadingSessions(false);
    }
  };

  // ▼ "세션 가져오기" (복제) 함수 ▼
  const handleCloneSession = async (session: any) => {
    try {
      // 1) 내 user.id 로 현재 최대 세션 ID 조회
      const maxRes = await axios.get(
        `http://13.209.75.24:3000/brainstorm/max/${user.id}`
      );
      const currentMaxSessionId = maxRes.data?.session_id ?? 0;
      const newSessionId = currentMaxSessionId + 1;

      // 2) 친구 세션의 user_id (ex. session.user_id)
      const friendUserId = session.user_id;
      console.log("세션 정보:", session);
      if (!friendUserId) {
        return alert("해당 세션 정보에 friend_user_id(또는 user_id)가 없습니다.");
      }

      // 3) 노드 정보 가져오기: GET /brainstorm/get_my_node_by_session/:friendUserId/:session_id
      const nodeRes = await axios.get(
        `http://13.209.75.24:3000/brainstorm/get_my_node_by_session/${friendUserId}/${session.session_id}`
      );
      // nodeRes.data = { session: {...}, nodes: [...] }
      const friendSessionData = nodeRes.data.session;
      const friendNodes = nodeRes.data.nodes;

      // 4) 노드 배열에서 session_id만 새 세션 번호로 교체
      const copiedNodes = friendNodes.map((node: any) => ({
        ...node,
        session_id: newSessionId,
      }));

      // 5) 서버로 보낼 JSON 형식
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

  // ▼ 패널 닫기 함수 ▼
  const closePanel = () => {
    setShowPanel(false);
    setSelectedFriend(null);
    setFriendSessions([]);
  };

  // 컴포넌트 마운트 시 친구 목록
  useEffect(() => {
    if (user?.username) {
      fetchFriends();
    }
  }, [user]);

  return (
    <div className="relative bg-gray-100 min-h-screen">
      {/* 상단 메뉴 */}
      <div className="flex items-center justify-between bg-gray-100 px-6 py-4 w-2/3 max-w-xl">
        <div className="flex space-x-4">
          {/* 친구 추가 버튼 */}
          <button
            className="bg-customGray text-white px-2 py-2 rounded-lg hover:bg-green-600 flex justify-center items-center"
            onClick={() => setShowAddFriendModal(true)}
          >
            <img src={add_friends} alt="친구추가" className="w-6 h-6" />
          </button>
          {/* 친구 요청 버튼 */}
          <button
            className="bg-customGray text-white px-2 py-2 rounded-lg hover:bg-blue-600 flex justify-center items-center"
            onClick={fetchFriendRequests}
          >
            <img src={request_friends} alt="친구요청" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 친구 추가 모달 */}
      {showAddFriendModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg text-black font-bold mb-4">친구 추가</h2>
            <input
              type="text"
              placeholder="친구 이름 입력"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAddFriendModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
              >
                취소
              </button>
              <button
                onClick={sendFriendRequest}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 친구 요청 모달 */}
      {showFriendRequestsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-[600px]">
            <h2 className="text-lg font-bold mb-4">친구 요청</h2>
            {friendRequests.length === 0 ? (
              <p className="text-gray-500">받은 친구 요청이 없습니다.</p>
            ) : (
              <ul className="space-y-4">
                {friendRequests.map((request) => (
                  <li
                    key={request.requester_id}
                    className="flex justify-between items-center bg-gray-100 rounded-lg p-4 shadow-md"
                  >
                    <span>
                      {request.requester_name}님이 친구 요청을 보냈습니다.
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() =>
                          respondToFriendRequest(request.requester_name, "accepted")
                        }
                        className="bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600"
                      >
                        수락
                      </button>
                      <button
                        onClick={() =>
                          respondToFriendRequest(request.requester_name, "rejected")
                        }
                        className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                      >
                        거절
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowFriendRequestsModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 친구 목록 */}
      <div className="mt-8 bg-gray-100 w-2/3 max-w-xl p-6">
        <h2 className="text-lg font-bold mb-4">친구 목록</h2>
        {loading ? (
          <p className="text-gray-500">로딩 중...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : friends.length === 0 ? (
          <p className="text-gray-500">친구가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex justify-between items-center bg-gray-100 rounded-lg p-4 shadow-md"
              >
                <span>{friend.username}</span>
                <div className="space-x-2">
                  {/* 친구 삭제 */}
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                    onClick={() => removeFriend(friend.username)}
                  >
                    삭제
                  </button>

                  {/* 친구 세션 보기 */}
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600"
                    onClick={() => handleFetchFriendSessions(friend.username)}
                  >
                    세션 보기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 오른쪽에서 슬라이드되는 세션 패널 (스크롤 가능) */}
      <div
        className={`
          fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 h-screen bg-white shadow-xl
          transform transition-transform duration-300 z-50
          ${showPanel ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* 패널 내부를 flex 컨테이너로 잡고, 스크롤할 부분을 따로 분리 */}
        <div className="p-6 h-full flex flex-col">
          {/* 닫기 버튼 고정 영역 */}
          <div className="flex-none mb-4">
            <button
              onClick={closePanel}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              닫기
            </button>
          </div>

          {/* 스크롤 가능 영역 */}
          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <p className="text-gray-600">로딩 중...</p>
            ) : selectedFriend ? (
              <>
                <h2 className="text-lg font-bold mb-4">{selectedFriend}님의 세션</h2>
                {(() => {
                  const visibleSessions = friendSessions.filter(
                    (s) => s.visibility === "public" || s.visibility === "friends"
                  );

                  if (visibleSessions.length === 0) {
                    return (
                      <p className="text-gray-500">
                        공개 혹은 친구 공개 세션이 없습니다.
                      </p>
                    );
                  }

                  return (
                    <ul className="space-y-2">
                      {visibleSessions.map((session) => (
                        <li
                          key={session.session_id}
                          className="bg-gray-100 p-3 rounded shadow"
                        >
                          <h3 className="font-semibold">
                            {session.session_title?.trim() || "NO TITLE"}
                          </h3>
                          <p className="text-sm">공개 범위: {session.visibility}</p>
                          <p className="text-xs text-gray-500">
                            작성일:{" "}
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>

                          {/* ▼ "세션 가져오기" 버튼 ▼ */}
                          <button
                            onClick={() => handleCloneSession(session)}
                            className="mt-2 bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                          >
                            세션 가져오기
                          </button>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </>
            ) : (
              <p className="text-gray-600">
                친구 목록에서 세션을 볼 친구를 선택하세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Connections;
