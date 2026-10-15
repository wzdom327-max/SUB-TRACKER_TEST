// localStorage에서 구독 배열을 저장하고 찾을 때 사용할 고유 키입니다.
const STORAGE_KEY = "sub-tracker.subscriptions";
// HTML에 있는 입력 폼과 상태 안내 요소를 미리 찾아 이벤트 처리에 재사용합니다.
const form = document.querySelector("#subscription-form");
const statusMessage = document.querySelector("#status-message");
// 앱이 시작될 때 브라우저 저장 공간에서 이전 데이터를 복원합니다.
let subscriptions = loadSubscriptions();

// 사용자에게 저장 성공이나 실패 등 현재 상태를 보여줍니다.
function showStatus(message) {
    statusMessage.textContent = message;
}

// 브라우저 저장 공간에서 구독 목록을 읽어옵니다.
function loadSubscriptions() {
    try {
        // 처음 사용하는 브라우저라 저장 값이 없으면 빈 목록으로 시작합니다.
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) return [];
        // localStorage에는 문자열만 저장할 수 있으므로 JSON 문자열을 배열로 복원합니다.
        const parsed = JSON.parse(saved);
        // JSON은 배열 외의 값도 표현할 수 있으므로 기대한 데이터 모양인지 확인합니다.
        if (!Array.isArray(parsed)) {
            throw new Error("저장된 구독 데이터가 배열 형식이 아닙니다.");
        }
        return parsed;
    } catch (error) {
        // 저장소 접근 차단이나 JSON 손상 등 실제 실패 원인을 콘솔에도 남깁니다.
        console.error("구독 데이터를 불러오지 못했습니다.", error);
        showStatus("저장된 구독 데이터를 불러오지 못했습니다. 브라우저 저장 공간을 확인해주세요.");
        return [];
    }
}

// 현재 구독 배열 전체를 JSON 문자열로 바꾸어 localStorage에 저장합니다.
function saveSubscriptions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
        showStatus("변경 사항을 저장했어요.");
        return true;
    } catch (error) {
        // 저장 공간 부족이나 브라우저 정책으로 저장하지 못한 경우 사용자에게 알립니다.
        console.error("구독 데이터를 저장하지 못했습니다.", error);
        showStatus("구독 데이터를 저장하지 못했습니다. 브라우저 저장 공간 설정을 확인해주세요.");
        return false;
    }
}

// ui.js의 통합 렌더링 함수를 호출해 화면을 데이터와 동기화합니다.
function refreshApp() {
    renderApp(subscriptions);
}

// 입력값과 폼의 수정 모드 표시를 초기 상태로 돌립니다.
function resetForm() {
    form.reset();
    form.elements.id.value = "";
    document.querySelector("#form-title").textContent = "구독 추가";
    document.querySelector("#submit-button").textContent = "구독 추가";
    document.querySelector("#cancel-edit").hidden = true;
}

// 전달받은 ID의 데이터를 폼에 채우고 수정 모드로 전환합니다.
function startEditing(id) {
    // ID는 문자열/숫자로 저장되었을 수 있으므로 문자열로 맞춰 비교합니다.
    const subscription = subscriptions.find((item) => String(item.id) === id);
    if (!subscription) {
        showStatus("수정할 구독을 찾을 수 없습니다.");
        return;
    }

    // hidden ID 필드에 기존 ID를 넣으면 제출 시 새 항목이 아닌 수정으로 처리됩니다.
    form.elements.id.value = subscription.id;
    form.elements.name.value = subscription.name;
    form.elements.amount.value = subscription.amount;
    form.elements.cycle.value = subscription.cycle;
    form.elements.nextPaymentDate.value = subscription.nextPaymentDate;
    form.elements.category.value = subscription.category;
    form.elements.paymentmethod.value = subscription.paymentmethod || "";
    document.querySelector("#form-title").textContent = "구독 수정";
    document.querySelector("#submit-button").textContent = "변경 사항 저장";
    document.querySelector("#cancel-edit").hidden = false;
    // 수정할 내용을 바로 바꿀 수 있도록 폼으로 이동하고 이름 입력란에 포커스를 둡니다.
    form.elements.name.focus();
    document.querySelector("#form-title").scrollIntoView({ behavior: "smooth", block: "center" });
}

// 폼 제출 이벤트는 새 구독 추가와 기존 구독 수정을 모두 처리합니다.
form.addEventListener("submit", (event) => {
    // 브라우저가 페이지를 새로고침하는 기본 제출 동작 대신 JavaScript에서 처리합니다.
    event.preventDefault();
    // required, min 등의 HTML 기본 제약 조건을 검증하고 실패하면 중단합니다.
    if (!form.reportValidity()) return;

    // name 속성으로 각 입력값을 모아 읽을 수 있는 FormData 객체를 만듭니다.
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    // 브라우저 입력 검증 외에도 저장 전 금액이 유효한 양수인지 다시 확인합니다.
    if (!Number.isFinite(amount) || amount <= 0) {
        showStatus("금액은 1원 이상의 숫자로 입력해주세요.");
        return;
    }

    // 수정 중이면 폼에 들어 있는 기존 ID를 사용합니다.
    // 새 항목이면 고유 UUID를 만들고, 미지원 브라우저에서는 시간/난수 조합을 사용합니다.
    const id = String(formData.get("id") || (crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`));
    // 폼의 문자열 값을 계산에 맞는 자료형과 키를 가진 구독 객체로 정리합니다.
    const subscription = {
        id,
        name: String(formData.get("name")).trim(),
        amount,
        cycle: String(formData.get("cycle")),
        nextPaymentDate: String(formData.get("nextPaymentDate")),
        category: String(formData.get("category")).trim(),
        paymentmethod: String(formData.get("paymentmethod")).trim()
    };
    // 저장 실패 시 원래 배열을 복원할 수 있도록 기존 배열 참조를 보관합니다.
    const existingIndex = subscriptions.findIndex((item) => String(item.id) === id);
    const previous = subscriptions;
    // 기존 ID가 있으면 해당 요소만 교체하고, 그렇지 않으면 새 객체를 배열 끝에 추가합니다.
    if (existingIndex >= 0) {
        subscriptions = subscriptions.map((item, index) => index === existingIndex ? subscription : item);
    } else {
        subscriptions = [...subscriptions, subscription];
    }

    // 저장이 성공했을 때에만 폼 초기화와 화면 갱신을 수행합니다.
    if (!saveSubscriptions()) {
        subscriptions = previous;
        return;
    }
    resetForm();
    refreshApp();
});

// 목록의 모든 수정/삭제 버튼에 공통 클릭 처리기를 하나만 등록합니다.
// 동적으로 다시 만들어지는 카드마다 별도 처리기를 달지 않아도 됩니다(이벤트 위임).
document.querySelector("#subscription-list").addEventListener("click", (event) => {
    // 클릭한 요소가 버튼이 아니거나 action 정보가 없으면 무시합니다.
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "edit") {
        // 수정 버튼의 data-id에 연결된 항목을 폼에 불러옵니다.
        startEditing(button.dataset.id);
        return;
    }
    if (button.dataset.action === "delete") {
        // 삭제 전에 확인창을 띄워 실수로 항목을 지우지 않도록 합니다.
        const subscription = subscriptions.find((item) => String(item.id) === button.dataset.id);
        if (!subscription || !window.confirm(`${subscription.name} 구독을 삭제할까요?`)) return;

        // 삭제 전 배열을 보관하고, 저장 실패 시 되돌릴 수 있게 합니다.
        const previous = subscriptions;
        subscriptions = subscriptions.filter((item) => String(item.id) !== button.dataset.id);
        // 삭제 내용의 저장 성공 여부에 따라 화면 반영 또는 원상 복구를 결정합니다.
        if (saveSubscriptions()) {
            if (form.elements.id.value === button.dataset.id) resetForm();
            refreshApp();
        } else {
            subscriptions = previous;
        }
    }
});

// 수정 취소를 누르면 편집 중인 변경 내용을 버리고 새 항목 입력 상태로 돌아갑니다.
document.querySelector("#cancel-edit").addEventListener("click", resetForm);

// 스크립트 초기화가 끝나면 저장된 데이터(없으면 빈 목록)를 첫 화면에 렌더링합니다.
refreshApp();
