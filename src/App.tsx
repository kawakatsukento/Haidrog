import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, increment, Timestamp } from 'firebase/firestore'
import { db } from './lib/firebase'
import { differenceInCalendarDays } from 'date-fns'
import './index.css'

// Constants for daily consumption prediction
const DAILY_CONSUMPTION_WATER = 3;
const DAILY_CONSUMPTION_TEA = 2;
const CASE_SIZE = 24;

interface DeliveryData {
  next_date: Timestamp;
}

function App() {
  const [waterCount, setWaterCount] = useState<number>(0);
  const [teaCount, setTeaCount] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    // Listen to water stock
    const unsubWater = onSnapshot(doc(db, "stocks", "water"), (doc) => {
      if (doc.exists()) {
        setWaterCount(doc.data().count);
      } else {
        console.log("No water doc found");
      }
    }, (error) => {
      console.error("Water snapshot error:", error);
    });

    // Listen to tea stock
    const unsubTea = onSnapshot(doc(db, "stocks", "tea"), (doc) => {
      if (doc.exists()) {
        setTeaCount(doc.data().count);
      }
    }, (error) => {
      console.error("Tea snapshot error:", error);
    });

    // Listen to delivery settings
    const unsubDelivery = onSnapshot(doc(db, "settings", "delivery"), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as DeliveryData;
        if (data.next_date) {
          setDeliveryDate(data.next_date.toDate());
        }
      }
      setLoading(false);
    }, (error) => {
      console.log("Settings error:", error); // Settings might be optional
      setLoading(false);
    });

    return () => {
      unsubWater();
      unsubTea();
      unsubDelivery();
    };
  }, []);

  const updateStock = async (type: 'water' | 'tea', amount: number) => {
    try {
      const ref = doc(db, "stocks", type);
      // Use setDoc with merge: true to create the document if it doesn't exist
      await setDoc(ref, {
        count: increment(amount),
        label: type === 'water' ? 'おみず' : 'おちゃ' // Ensure label is set on creation
      }, { merge: true });
    } catch (e: any) {
      console.error("Update error:", e);
    }
  };

  const getPredictionMessage = () => {
    if (!deliveryDate) return null;

    const today = new Date();
    const daysUntil = differenceInCalendarDays(deliveryDate, today);
    if (daysUntil < 0) return null; // Delivery date passed

    // Calculate predicted remaining stock
    const predictedWater = waterCount - (DAILY_CONSUMPTION_WATER * daysUntil);
    const predictedTea = teaCount - (DAILY_CONSUMPTION_TEA * daysUntil);

    // Check if either will overflow (more than 1 case remaining)
    // Actually spec says: "If predicted remaining > 24"
    // We check total bottles? Or per type? Spec implies "stock" generally.
    // "Predict > 24" for "water" or "tea".
    // "1 box worth" (24 bottles).

    const isWaterOverflow = predictedWater > CASE_SIZE;
    const isTeaOverflow = predictedTea > CASE_SIZE;

    if (isWaterOverflow || isTeaOverflow) {
      return (
        <div className="bg-[#FFFBEB] p-4 rounded-xl text-[#92400E] text-sm text-center leading-relaxed animate-fade-in">
          つぎの はいたつまでに、すこし あまりそうかも。<br />
          スキップを かんがえてみてね。
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-slate-800 font-sans p-4 flex flex-col items-center">
      <header className="w-full max-w-md py-6 flex justify-center">
        <h1 className="text-2xl font-bold text-slate-700 tracking-wider">はいどろぐ</h1>
      </header>



      <main className="w-full max-w-md flex-1 flex flex-col gap-6">
        {/* Water Section */}
        <section className="bg-[#E0F2FE] p-6 rounded-[30px_10px_30px_20px] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <h2 className="text-[#0369A1] font-bold text-lg mb-2">おみず</h2>
          <div className="text-4xl font-bold text-[#0369A1] text-center my-4">
            {waterCount} <span className="text-xl font-normal">本</span>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => updateStock('water', -1)}
              className="bg-white text-[#0369A1] px-4 py-2 rounded-full shadow-sm font-bold active:scale-95 transition-transform hover:bg-slate-50"
            >
              のんだ！
            </button>
            <button
              onClick={() => updateStock('water', 1)}
              className="bg-white text-[#0369A1] px-4 py-2 rounded-full shadow-sm font-bold active:scale-95 transition-transform hover:bg-slate-50 border border-[#0369A1]"
            >
              1ぽん
            </button>
            <button
              onClick={() => updateStock('water', 9)}
              className="bg-[#0369A1] text-white px-4 py-2 rounded-full shadow-sm font-bold active:scale-95 transition-transform hover:bg-[#0284c7]"
            >
              とどいた！
            </button>
          </div>
        </section>

        {/* Tea Section */}
        <section className="bg-[#ECFDF5] p-6 rounded-[10px_30px_20px_30px] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <h2 className="text-[#047857] font-bold text-lg mb-2">おちゃ</h2>
          <div className="text-4xl font-bold text-[#047857] text-center my-4">
            {teaCount} <span className="text-xl font-normal">本</span>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => updateStock('tea', -1)}
              className="bg-white text-[#047857] px-4 py-2 rounded-full shadow-sm font-bold active:scale-95 transition-transform hover:bg-slate-50"
            >
              のんだ！
            </button>
            <button
              onClick={() => updateStock('tea', 1)}
              className="bg-white text-[#047857] px-4 py-2 rounded-full shadow-sm font-bold active:scale-95 transition-transform hover:bg-slate-50 border border-[#047857]"
            >
              1ぽん
            </button>
            <button
              onClick={() => updateStock('tea', 8)}
              className="bg-[#047857] text-white px-4 py-2 rounded-full shadow-sm font-bold active:scale-95 transition-transform hover:bg-[#059669]"
            >
              とどいた！
            </button>
          </div>
        </section>

        {/* Warning Notification */}
        {getPredictionMessage()}

      </main>
    </div>
  )
}

export default App
