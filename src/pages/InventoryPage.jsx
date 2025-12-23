import { Package, AlertCircle, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react';
import { Card } from '../components/common';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Készletek</h1>
        <p className="text-gray-500 mt-1">Egységenkénti készletnyilvántartás</p>
      </div>

      {/* Placeholder content */}
      <Card className="bg-amber-50 border-amber-200">
        <div className="p-6 text-center">
          <Package className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-amber-800 mb-2">
            Készletkezelés - Hamarosan
          </h2>
          <p className="text-amber-600 max-w-md mx-auto">
            Ez a modul külső rendszerből importált készletadatokat fog megjeleníteni.
            API integráció szükséges a teljes funkcionalitáshoz.
          </p>
        </div>
      </Card>

      {/* Preview of planned features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktuális készlet</p>
                <p className="text-xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Bevételezés (ma)</p>
                <p className="text-xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Kiadás (ma)</p>
                <p className="text-xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Selejt (ma)</p>
                <p className="text-xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Planned features list */}
      <Card>
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tervezett funkciók</h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2" />
              <span>Egységenkénti készletállomány megjelenítése</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2" />
              <span>Bevételezések és kiadások naplózása</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2" />
              <span>Selejtezés nyilvántartása</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2" />
              <span>Készletmozgás riportok</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2" />
              <span>API integráció külső készletkezelő rendszerrel</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
