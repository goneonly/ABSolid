import { useEffect, useState } from 'react'

// 화면이 열릴 때 서버에서 데이터를 불러오는 공통 훅
// 사용: const { data, loaded, error, reload } = useLoad(() => fetchUsers(query), [query])
//   data   불러온 값 (아직이면 null)
//   loaded 첫 응답(성공·실패)을 받았는지
//   error  실패했을 때 보여줄 문구 ('' 이면 정상)
//   reload 다시 불러오기 (저장·삭제 후 목록 갱신용)
// deps 가 바뀌면 다시 불러오고, 늦게 도착한 예전 응답은 버림
export function useLoad(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loaded: false, error: '' })
  const [round, setRound] = useState(0)

  useEffect(() => {
    let alive = true
    fetcher()
      .then((data) => alive && setState({ data, loaded: true, error: '' }))
      .catch((e) => alive && setState((prev) => ({ ...prev, loaded: true, error: e.message })))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, round])

  return { ...state, reload: () => setRound((n) => n + 1) }
}
