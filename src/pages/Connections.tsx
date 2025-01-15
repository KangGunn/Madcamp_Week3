import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import add_friends from "../assets/image/add_friends.png";
import request_friends from "../assets/image/request_friend.png";
import axios from "axios";

function Connections() {
  const { user } = useAuth(); // 현재 사용자 정보 가져오기
  const [friends, setFriends] = useState([]); // 친구 목록 상태
  const [friendRequests, setFriendRequests] = useState([]); // 친구 요청 목록 상태
  const [loading, setLoading] = useState(true); // 로딩 상태 관리
  const [error, setError] = useState(null); // 에러 상태 관리
  const [showAddFriendModal, setShowAddFriendModal] = useState(false); // 친구 추가 모달 창 표시 상태
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false); // 친구 요청 모달 창 표시 상태
  const [friendName, setFriendName] = useState(""); // 입력된 친구 이름

  // ▼ 추가된 state들 ▼
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null); // "세션 보기" 버튼 누른 친구
  const [friendSessions, setFriendSessions] = useState<any[]>([]);   // 해당 친구의 세션 목록
  const [showPanel, setShowPanel] = useState(false);          // 오른쪽 세션 패널 표시 여부
  const [loadingSessions, setLoadingSessions] = useState(false); // 친구 세션 로딩 상태

  // 친구 목록 가져오기
  const fetchFriends = async () => {
    try {
      const response = await axios.get(
        `http://13.209.75.24:3000/friends/${user.username}/list`
      );
      setFriends(response.data.friends || []); // 서버에서 받은 데이터 저장
      setLoading(false); // 로딩 완료
    } catch (err) {
      console.error("친구 목록 가져오기 실패:", err);
      setError("친구 목록을 가져오는 데 실패했습니다.");
      setLoading(false); // 로딩 종료
    }
  };

  // 친구 요청 목록 가져오기
  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(
        `http://13.209.75.24:3000/friends/${user.username}/requests`
      );
      setFriendRequests(response.data.friend_requests || []); // 서버에서 받은 데이터 저장
      setShowFriendRequestsModal(true); // 친구 요청 모달 창 표시
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
      setFriendName(""); // 입력 필드 초기화
      setShowAddFriendModal(false); // 모달 닫기
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
      // 처리된 요청을 목록에서 제거
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
          user_username: user.username, // 현재 사용자 이름
          friend_username: friendName, // 삭제할 친구 이름
        },
      });
      alert(`${friendName}님을 삭제했습니다.`);
      // 친구 목록에서 제거
      setFriends((prev) =>
        prev.filter((friend) => friend.username !== friendName)
      );
    } catch (err) {
      console.error("친구 삭제 실패:", err);
      alert("친구를 삭제하는 데 실패했습니다.");
    }
  };

  // ▼ 추가된 함수: 특정 친구 세션 가져오기 ▼
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
      setShowPanel(true); // 패널 열기
    } catch (err) {
      console.error("친구 세션 가져오기 실패:", err);
      alert("세션을 가져오는 데 실패했습니다.");
    } finally {
      setLoadingSessions(false);
    }
  };

  // ▼ 패널 닫기 함수 ▼
  const closePanel = () => {
    setShowPanel(false);
    setSelectedFriend(null);
    setFriendSessions([]);
  };

  // 초기 렌더링 시 친구 목록 요청
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
                          respondToFriendRequest(
                            request.requester_name,
                            "accepted"
                          )
                        }
                        className="bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600"
                      >
                        수락
                      </button>
                      <button
                        onClick={() =>
                          respondToFriendRequest(
                            request.requester_name,
                            "rejected"
                          )
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
                  {/* 기존 삭제 버튼 */}
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                    onClick={() => removeFriend(friend.username)}
                  >
                    삭제
                  </button>
                  {/* ▼ 추가된 버튼: 세션 보기 ▼ */}
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

      {/* ▼ 오른쪽에서 슬라이드되는 세션 패널 ▼ */}
      <div
        className={`
          fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 h-screen bg-white shadow-xl p-6
          transform transition-transform duration-300 z-50
          ${showPanel ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <button
          onClick={closePanel}
          className="mb-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          닫기
        </button>

        {loadingSessions ? (
          <p className="text-gray-600">로딩 중...</p>
        ) : selectedFriend ? (
          <>
            <h2 className="text-lg font-bold mb-4">{selectedFriend}님의 세션</h2>
            {/**
             * 여기서 공개/친구 세션만 보려면 visibility 필터링
             * (원치 않으시면 삭제 가능)
             */}
            {/**
             * 예: public 또는 friends 만 보여주기
             */}
            {(() => {
              const visibleSessions = friendSessions.filter(
                (s) =>
                  s.visibility === "public" || s.visibility === "friends"
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
                      <p className="text-sm">
                        공개 범위: {session.visibility}
                      </p>
                      <p className="text-xs text-gray-500">
                        작성일:{" "}
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
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
  );
}

export default Connections;
