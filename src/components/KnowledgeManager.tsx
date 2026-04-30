import { useState, useEffect } from 'react';
import { Database, Plus, Check, AlertCircle, X, Trash2, RefreshCw, BarChart3, List, BookOpen, Settings, Zap } from 'lucide-react';
import { addKnowledge, addCourse, addService, supabase, updateMissingEmbeddings } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'pianos' | 'courses' | 'services';

export function KnowledgeManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('pianos');
  const [formData, setFormData] = useState({
    category: 'Piano Cơ',
    brand: '',
    model: '',
    price: '',
    content: '',
    title: '',
    schedule: '',
    duration: '',
    subtitle: '',
    image_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [existingData, setExistingData] = useState<{ pianos: any[], courses: any[], services: any[] }>({
    pianos: [],
    courses: [],
    services: []
  });
  const [loadingList, setLoadingList] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const categories = ['Piano Cơ', 'Piano Điện', 'Dịch vụ', 'Chính sách', 'Thông tin'];

  const fetchExistingData = async () => {
    setLoadingList(true);
    try {
      const [pianos, courses, services] = await Promise.all([
        supabase.from('piano_knowledge').select('*').order('created_at', { ascending: false }),
        supabase.from('piano_courses').select('*').order('id', { ascending: false }),
        supabase.from('piano_services').select('*').order('id', { ascending: false })
      ]);
      
      setExistingData({
        pianos: pianos.data || [],
        courses: courses.data || [],
        services: services.data || []
      });
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchExistingData();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');
    
    let result: any;
    if (activeTab === 'pianos') {
      result = await addKnowledge({
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        price: formData.price,
        content: formData.content,
        image_url: formData.image_url
      });
    } else if (activeTab === 'courses') {
      result = await addCourse({
        title: formData.title,
        price: formData.price,
        schedule: formData.schedule,
        duration: formData.duration,
        content: formData.content,
        image_url: formData.image_url
      });
    } else {
      result = await addService({
        title: formData.title,
        subtitle: formData.subtitle,
        content: formData.content,
        image_url: formData.image_url
      });
    }
    
    if (result.success) {
      setStatus('success');
      setFormData({ 
        ...formData, 
        brand: '', model: '', price: '', content: '', 
        title: '', schedule: '', duration: '', subtitle: '', image_url: ''
      });
      fetchExistingData();
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setErrorMessage(result.error?.message || 'Lỗi! Bạn đã tạo bảng trong Supabase chưa?');
    }
    setIsSubmitting(false);
  };

  const handlePrepareSync = () => {
    const webData = {
      pianos: [
        { category: 'Piano Cơ', brand: 'Yamaha', model: 'C3', price: '285.000.000đ', content: 'Dòng Grand chuẩn mực cho nhạc viện và biểu diễn. Âm thanh vang dội.' },
        { category: 'Piano Cơ', brand: 'Yamaha', model: 'G2', price: '165.000.000đ', content: 'Kích thước vừa phải, âm sắc ấm áp, cổ điển.' }
      ],
      courses: [
        { title: 'LỚP PIANO CƠ BẢN', price: '3.600.000 VNĐ / 3 tháng', schedule: '2 buổi/tuần', duration: '60 phút/buổi', content: 'Dành cho người mới bắt đầu. Nhạc lý cơ bản, chơi Happy Birthday, Canon in D.' },
        { title: 'LỚP PIANO NÂNG CAO', price: '6.000.000 VNĐ / 3 tháng', schedule: '2 buổi/tuần', duration: '60 phút/buổi', content: 'Kỹ thuật ngón nâng cao, hòa âm, đệm hát, luyện thi nhạc viện.' },
        { title: 'PIANO 1 KÈM 1', price: '400.000 VNĐ / buổi', schedule: 'Linh hoạt', duration: '60 phút/buổi', content: 'Cá nhân hóa từng phím đàn, hiệu quả gấp 3 lần lớp nhóm.' }
      ],
      services: [
        { title: 'Lên dây Piano (Tuning)', subtitle: 'Âm thanh chuẩn xác', content: 'Dịch vụ lên dây chuyên nghiệp giúp kéo dài tuổi thọ đàn.' },
        { title: 'Vận chuyển Piano', subtitle: 'An toàn - Nhanh chóng', content: 'Chuyên chở piano tận nơi toàn quốc, an toàn tuyệt đối.' },
        { title: 'Kiểm tra & Sửa đàn', subtitle: 'Bảo dưỡng tận nơi', content: 'Xử lý kẹt phím, đứt dây, bảo dưỡng máy móc định kỳ.' },
        { title: 'Tân trang đàn Piano', subtitle: 'Làm mới diện mạo', content: 'Sơn lại, hồi sinh âm thanh và vẻ đẹp nguyên bản.' },
        { title: 'Thuê đàn Piano giá rẻ', subtitle: 'Giao nhanh toàn quốc', content: 'Cho thuê piano sự kiện, học tập với giá ưu đãi.' }
      ]
    };
    
    setPreviewData(activeTab === 'pianos' ? webData.pianos : 
                  activeTab === 'courses' ? webData.courses : webData.services);
  };

  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const handleConfirmSync = async () => {
    if (!previewData) return;
    setIsSubmitting(true);
    setStatus('idle');
    setSyncProgress({ current: 0, total: previewData.length });
    setErrorMessage(`Đang xử lý 0/${previewData.length} mục...`);
    
    try {
      // Xử lý song song 3 mục một lúc để tránh bị giới hạn API nhưng vẫn nhanh
      const chunkSize = 3;
      for (let i = 0; i < previewData.length; i += chunkSize) {
        const chunk = previewData.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (item) => {
          if (activeTab === 'pianos') await addKnowledge(item);
          else if (activeTab === 'courses') await addCourse(item);
          else await addService(item);
        }));
        
        const progress = Math.min(i + chunkSize, previewData.length);
        setSyncProgress({ current: progress, total: previewData.length });
        setErrorMessage(`Đang đồng bộ: ${progress}/${previewData.length} mục...`);
      }
      
      await fetchExistingData();
      setPreviewData(null);
      setStatus('success');
      setErrorMessage('Đã đồng bộ xong dữ liệu chính thức!');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Lỗi đồng bộ: ' + (err as Error).message);
    }
    setIsSubmitting(false);
  };

  const handleUpdateAI = async () => {
    setIsSubmitting(true);
    setErrorMessage('Đang chuẩn bị cập nhật AI...');
    try {
      const count = await updateMissingEmbeddings((current) => {
        setErrorMessage(`Đang cập nhật bộ não AI: Đã xử lý ${current} mục...`);
      });
      await fetchExistingData();
      if (count === 0) {
        setErrorMessage('Dữ liệu AI đã đầy đủ, không cần cập nhật thêm.');
        setStatus('idle');
      } else {
        setStatus('success');
        setErrorMessage(`Đã cập nhật AI thành công cho ${count} mục!`);
      }
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage('Lỗi cập nhật AI: ' + (err as Error).message);
    }
    setIsSubmitting(false);
  };

  const deleteItem = async (id: number) => {
    const table = activeTab === 'pianos' ? 'piano_knowledge' : 
                  activeTab === 'courses' ? 'piano_courses' : 'piano_services';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) fetchExistingData();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="knowledge-modal-title"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="bg-surface border border-line w-full max-w-5xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
          >
            {/* Tabs */}
            <div className="flex bg-bg/50 border-b border-line" id="knowledge-modal-title">
              {[
                { id: 'pianos', icon: <Database size={16}/>, label: 'Đàn Piano' },
                { id: 'courses', icon: <BookOpen size={16}/>, label: 'Khóa Học' },
                { id: 'services', icon: <Settings size={16}/>, label: 'Dịch Vụ' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id as TabType); setPreviewData(null); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === t.id ? "text-gold border-b-2 border-gold bg-gold/5" : "text-text-muted hover:bg-white/5 border-b-2 border-transparent"
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
              <button onClick={onClose} className="px-6 border-l border-line text-text-muted hover:text-red-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
               {/* Form */}
               <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-bg/20 border-r border-line space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gold">Nhập liệu {activeTab}</h3>
                  
                  {activeTab === 'pianos' && (
                    <div className="grid grid-cols-2 gap-4">
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="col-span-2 p-3 bg-bg border border-line rounded-xl text-sm text-white">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input placeholder="Hãng" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="p-3 bg-bg border border-line rounded-xl text-sm" />
                      <input placeholder="Model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="p-3 bg-bg border border-line rounded-xl text-sm" />
                    </div>
                  )}

                  {activeTab === 'courses' && (
                    <div className="space-y-4">
                      <input placeholder="Tên khóa học" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-bg border border-line rounded-xl text-sm" />
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Học phí" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="p-3 bg-bg border border-line rounded-xl text-sm" />
                        <input placeholder="Số buổi" value={formData.schedule} onChange={e => setFormData({...formData, schedule: e.target.value})} className="p-3 bg-bg border border-line rounded-xl text-sm" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'services' && (
                    <div className="space-y-4">
                      <input placeholder="Tên dịch vụ" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-bg border border-line rounded-xl text-sm" />
                      <input placeholder="Slogan ngắn" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full p-3 bg-bg border border-line rounded-xl text-sm" />
                    </div>
                  )}

                  <input 
                    placeholder="Link ảnh (https://...)" 
                    value={formData.image_url} 
                    onChange={e => setFormData({...formData, image_url: e.target.value})} 
                    className="w-full p-3 bg-bg border border-line rounded-xl text-sm" 
                  />

                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Nội dung AI học thuộc..."
                    className="w-full h-32 p-4 bg-bg border border-line rounded-xl text-sm resize-none"
                  />

                  <div className="flex gap-3">
                    <button onClick={handlePrepareSync} className="flex-1 p-3 border border-gold/30 text-gold text-[10px] font-black uppercase rounded-xl hover:bg-gold/5">Sync Mẫu</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] p-3 bg-gold text-bg font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs">
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <Check size={16}/>}
                      Lưu Ngay
                    </button>
                  </div>
                  {errorMessage && <div className="p-3 bg-red-500/10 text-red-400 text-[10px] rounded-xl">{errorMessage}</div>}
               </div>

               {/* List */}
               <div className="w-full md:w-1/2 p-6 flex flex-col bg-bg/40 overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Dữ liệu hiện có</h3>
                    <button 
                      onClick={handleUpdateAI}
                      disabled={isSubmitting}
                      className="p-2 px-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-blue-500/30 transition-all"
                    >
                      <Zap size={12} className={isSubmitting ? "animate-spin" : ""} />
                      ⚡ CẬP NHẬT AI
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {loadingList ? (
                      <div className="h-full flex items-center justify-center text-gold"><RefreshCw className="animate-spin" /></div>
                    ) : (
                      previewData ? (
                        previewData.map((d, i) => (
                          <div key={i} className="p-4 bg-surface border border-green-500/30 rounded-2xl">
                            <p className="text-xs font-bold text-white">{d.brand || d.title} {d.model || ''}</p>
                            <p className="text-[10px] text-text-muted mt-1 italic">{d.content}</p>
                            <button onClick={handleConfirmSync} className="w-full mt-4 p-3 bg-green-500 text-white font-bold rounded-xl text-xs">XÁC NHẬN ĐỔ VÀO DB</button>
                          </div>
                        ))
                      ) : (
                        existingData[activeTab].map((item: any) => (
                          <div key={item.id} className="p-4 bg-surface border border-line rounded-2xl group flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-white">{item.brand || item.title} {item.model || ''}</p>
                              <p className="text-[10px] text-text-muted mt-1 italic line-clamp-1">{item.content}</p>
                            </div>
                            <button onClick={() => deleteItem(item.id)} className="text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                          </div>
                        ))
                      )
                    )}
                  </div>
               </div>
            </div>
            {/* Footer */}
            <div className="p-4 bg-gold/5 border-t border-line text-center text-[9px] text-gold/60 uppercase tracking-widest font-black">
               💎 Piano Solna Admin | 🎹 Hệ thống tư vấn Piano thông minh từ Solna Team.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
