import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const appContent = document.getElementById('appContent');
const authForm = document.getElementById('authForm');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.getElementById('logoutButton');
const userEmailEl = document.getElementById('userEmail');
const form = document.getElementById('subscriptionForm');
const subscribersList = document.getElementById('subscribersList');
const totalSubscribersEl = document.getElementById('totalSubscribers');
const totalAmountEl = document.getElementById('totalAmount');

let isRegistering = false;

// Authentication
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    let result;
    if (isRegistering) {
      result = await supabase.auth.signUp({
        email,
        password,
      });
    } else {
      result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }
    
    if (result.error) {
      throw result.error;
    }
    
    if (isRegistering) {
      alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      isRegistering = false;
      document.getElementById('loginButton').textContent = 'تسجيل الدخول';
      registerButton.textContent = 'إنشاء حساب جديد';
    } else {
      showApp();
      loadSubscribers();
    }
  } catch (error) {
    alert(error.message);
  }
});

registerButton.addEventListener('click', () => {
  isRegistering = !isRegistering;
  document.getElementById('loginButton').textContent = isRegistering ? 'إنشاء الحساب' : 'تسجيل الدخول';
  registerButton.textContent = isRegistering ? 'العودة لتسجيل الدخول' : 'إنشاء حساب جديد';
});

logoutButton.addEventListener('click', async () => {
  await supabase.auth.signOut();
  hideApp();
});

// Check initial auth state
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    showApp();
    userEmailEl.textContent = session.user.email;
    loadSubscribers();
  } else {
    hideApp();
  }
});

function showApp() {
  loginForm.style.display = 'none';
  appContent.style.display = 'block';
}

function hideApp() {
  loginForm.style.display = 'block';
  appContent.style.display = 'none';
  authForm.reset();
}

// Filter buttons
document.getElementById('showAll').addEventListener('click', () => renderSubscribers('all'));
document.getElementById('showActive').addEventListener('click', () => renderSubscribers('active'));
document.getElementById('showExpired').addEventListener('click', () => renderSubscribers('expired'));

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const subscriber = {
    user_id: user.id,
    first_name: document.getElementById('firstName').value,
    last_name: document.getElementById('lastName').value,
    phone: document.getElementById('phone').value,
    amount: parseFloat(document.getElementById('amount').value),
    start_date: document.getElementById('startDate').value,
    end_date: document.getElementById('endDate').value
  };
  
  const { error } = await supabase
    .from('subscribers')
    .insert(subscriber);
  
  if (error) {
    alert('حدث خطأ أثناء إضافة المشترك');
    console.error(error);
    return;
  }
  
  form.reset();
  loadSubscribers();
});

async function loadSubscribers() {
  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    alert('حدث خطأ أثناء تحميل المشتركين');
    console.error(error);
    return;
  }
  
  renderSubscribers('all', subscribers);
}

function isSubscriptionExpired(endDate) {
  return new Date(endDate) < new Date();
}

function isSubscriptionEndingSoon(endDate) {
  const today = new Date();
  const end = new Date(endDate);
  const daysUntilExpiry = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}

function renderSubscribers(filter = 'all', subscribers = []) {
  subscribersList.innerHTML = '';
  
  let filteredSubscribers = subscribers;
  
  if (filter === 'active') {
    filteredSubscribers = subscribers.filter(s => !isSubscriptionExpired(s.end_date));
  } else if (filter === 'expired') {
    filteredSubscribers = subscribers.filter(s => isSubscriptionExpired(s.end_date));
  }
  
  filteredSubscribers.forEach(subscriber => {
    const isExpired = isSubscriptionExpired(subscriber.end_date);
    const isEndingSoon = isSubscriptionEndingSoon(subscriber.end_date);
    
    const subscriberEl = document.createElement('div');
    subscriberEl.className = `subscriber-card ${isExpired ? 'expired' : ''}`;
    
    subscriberEl.innerHTML = `
      <h3>${subscriber.first_name} ${subscriber.last_name}</h3>
      <p>رقم الهاتف: ${subscriber.phone}</p>
      <p>المبلغ: ${subscriber.amount} د.ج</p>
      <p>تاريخ البداية: ${new Date(subscriber.start_date).toLocaleDateString('ar-DZ')}</p>
      <p>تاريخ النهاية: ${new Date(subscriber.end_date).toLocaleDateString('ar-DZ')}</p>
      <p>
        <span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">
          ${isExpired ? 'منتهي' : 'نشط'}
        </span>
      </p>
      ${isEndingSoon ? `<p class="expiry-alert">تنبيه: الاشتراك سينتهي قريباً!</p>` : ''}
      <button onclick="deleteSubscriber('${subscriber.id}')">حذف</button>
    `;
    
    subscribersList.appendChild(subscriberEl);
  });
  
  updateSummary(subscribers);
}

async function deleteSubscriber(id) {
  if (confirm('هل أنت متأكد من حذف هذا المشترك؟')) {
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('حدث خطأ أثناء حذف المشترك');
      console.error(error);
      return;
    }
    
    loadSubscribers();
  }
}

function updateSummary(subscribers) {
  totalSubscribersEl.textContent = subscribers.length;
  const total = subscribers.reduce((sum, sub) => sum + sub.amount, 0);
  totalAmountEl.textContent = total.toLocaleString('ar-DZ');
}

// Make deleteSubscriber available globally
window.deleteSubscriber = deleteSubscriber;

// Check for expired subscriptions periodically
setInterval(() => {
  loadSubscribers();
}, 60000); // Check every minute