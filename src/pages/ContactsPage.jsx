import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  Filter,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Modal, Input, Select } from '../components/common';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

// Company types
const COMPANY_TYPES = [
  { value: 'customer', label: 'Ügyfél' },
  { value: 'supplier', label: 'Beszállító' },
  { value: 'both', label: 'Mindkettő' },
];

// Supplier categories
const SUPPLIER_CATEGORIES = [
  { value: 'vegetables', label: 'Zöldség' },
  { value: 'bakery', label: 'Pékáru' },
  { value: 'eggs', label: 'Tojás' },
  { value: 'meat', label: 'Hús' },
  { value: 'game', label: 'Vad' },
  { value: 'fish', label: 'Hal' },
  { value: 'softdrinks', label: 'Üdítő' },
  { value: 'alcohol', label: 'Alkohol' },
  { value: 'mixed', label: 'Vegyes' },
];

export default function ContactsPage() {
  const { isAdmin, profile } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    category: '',
  });

  // Modals
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    type: 'customer',
    supplier_category: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_number: '',
    our_contact_id: '',
    notes: '',
  });

  // Contact form
  const [contactForm, setContactForm] = useState({
    company_id: '',
    name: '',
    title: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch companies
      let companyQuery = supabase
        .from('companies')
        .select(`
          *,
          our_contact:user_profiles!companies_our_contact_id_fkey(id, full_name)
        `)
        .order('name');

      if (filters.type) {
        if (filters.type === 'both') {
          companyQuery = companyQuery.eq('type', 'both');
        } else {
          companyQuery = companyQuery.or(`type.eq.${filters.type},type.eq.both`);
        }
      }
      if (filters.category) {
        companyQuery = companyQuery.eq('supplier_category', filters.category);
      }

      const { data: companiesData, error: companiesError } = await companyQuery;
      if (companiesError) throw companiesError;

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('company_contacts')
        .select('*')
        .order('name');
      if (contactsError) throw contactsError;

      // Fetch users for "our contact" dropdown
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name');

      // Filter by search
      let filteredCompanies = companiesData || [];
      let filteredContacts = contactsData || [];

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchingContactCompanyIds = new Set(
          filteredContacts
            .filter(c =>
              c.name.toLowerCase().includes(searchLower) ||
              c.email?.toLowerCase().includes(searchLower) ||
              c.phone?.includes(searchLower)
            )
            .map(c => c.company_id)
        );

        filteredCompanies = filteredCompanies.filter(
          company =>
            company.name.toLowerCase().includes(searchLower) ||
            company.email?.toLowerCase().includes(searchLower) ||
            company.phone?.includes(searchLower) ||
            matchingContactCompanyIds.has(company.id)
        );
      }

      setCompanies(filteredCompanies);
      setContacts(filteredContacts);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Hiba az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle company expansion
  const toggleCompany = (companyId) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  // Get contacts for a company
  const getCompanyContacts = (companyId) => {
    return contacts.filter(c => c.company_id === companyId);
  };

  // Open company modal for new/edit
  const openCompanyModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm({
        name: company.name,
        type: company.type,
        supplier_category: company.supplier_category || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        tax_number: company.tax_number || '',
        our_contact_id: company.our_contact_id || '',
        notes: company.notes || '',
      });
    } else {
      setEditingCompany(null);
      setCompanyForm({
        name: '',
        type: 'customer',
        supplier_category: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        tax_number: '',
        our_contact_id: '',
        notes: '',
      });
    }
    setIsCompanyModalOpen(true);
  };

  // Open contact modal for new/edit
  const openContactModal = (companyId, contact = null) => {
    setSelectedCompanyId(companyId);
    if (contact) {
      setEditingContact(contact);
      setContactForm({
        company_id: contact.company_id,
        name: contact.name,
        title: contact.title || '',
        phone: contact.phone || '',
        email: contact.email || '',
        notes: contact.notes || '',
      });
    } else {
      setEditingContact(null);
      setContactForm({
        company_id: companyId,
        name: '',
        title: '',
        phone: '',
        email: '',
        notes: '',
      });
    }
    setIsContactModalOpen(true);
  };

  // Save company
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!companyForm.name.trim()) {
      toast.error('Add meg a cég nevét!');
      return;
    }

    try {
      const data = {
        ...companyForm,
        supplier_category: companyForm.type === 'customer' ? null : companyForm.supplier_category,
        our_contact_id: companyForm.our_contact_id || null,
      };

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', editingCompany.id);
        if (error) throw error;
        toast.success('Cég frissítve!');
      } else {
        const { error } = await supabase
          .from('companies')
          .insert(data);
        if (error) throw error;
        toast.success('Cég létrehozva!');
      }

      setIsCompanyModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Save contact
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim()) {
      toast.error('Add meg a kontakt nevét!');
      return;
    }

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('company_contacts')
          .update(contactForm)
          .eq('id', editingContact.id);
        if (error) throw error;
        toast.success('Kontakt frissítve!');
      } else {
        const { error } = await supabase
          .from('company_contacts')
          .insert(contactForm);
        if (error) throw error;
        toast.success('Kontakt létrehozva!');
      }

      setIsContactModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Hiba a mentéskor');
    }
  };

  // Delete company
  const handleDeleteCompany = async (company) => {
    if (!confirm(`Biztosan törlöd a "${company.name}" céget és minden kontaktját?`)) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);
      if (error) throw error;
      toast.success('Cég törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Delete contact
  const handleDeleteContact = async (contact) => {
    if (!confirm(`Biztosan törlöd "${contact.name}" kontaktot?`)) return;

    try {
      const { error } = await supabase
        .from('company_contacts')
        .delete()
        .eq('id', contact.id);
      if (error) throw error;
      toast.success('Kontakt törölve!');
      fetchData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Hiba a törléskor');
    }
  };

  // Get type badge
  const getTypeBadge = (type) => {
    switch (type) {
      case 'customer':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Ügyfél</span>;
      case 'supplier':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Beszállító</span>;
      case 'both':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Mindkettő</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ügyfelek</h1>
          <p className="text-gray-500 mt-1">Cégek és kontaktszemélyek kezelése</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openCompanyModal()}>
            <Plus className="h-4 w-4" />
            Új cég
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Keresés cégre vagy személyre..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red focus:border-pepper-red"
              />
            </div>
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden típus</option>
            {COMPANY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
          >
            <option value="">Minden kategória</option>
            {SUPPLIER_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Companies list */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Betöltés...</div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nincsenek cégek</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => openCompanyModal()}>
                <Plus className="h-4 w-4" />
                Első cég hozzáadása
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {companies.map(company => {
              const companyContacts = getCompanyContacts(company.id);
              const isExpanded = expandedCompanies.has(company.id);

              return (
                <div key={company.id}>
                  {/* Company row */}
                  <div
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50',
                      isExpanded && 'bg-gray-50'
                    )}
                    onClick={() => toggleCompany(company.id)}
                  >
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{company.name}</p>
                        {getTypeBadge(company.type)}
                        {company.supplier_category && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            {SUPPLIER_CATEGORIES.find(c => c.value === company.supplier_category)?.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {company.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {company.email}
                          </span>
                        )}
                        {company.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {company.phone}
                          </span>
                        )}
                        {company.our_contact && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {company.our_contact.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {companyContacts.length} kontakt
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openCompanyModal(company)}
                          className="p-2 text-gray-500 hover:text-pepper-red rounded-lg hover:bg-gray-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company)}
                          className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contacts list */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {companyContacts.length === 0 ? (
                        <div className="p-4 pl-16 text-sm text-gray-500">
                          Nincsenek kontaktszemélyek
                        </div>
                      ) : (
                        companyContacts.map(contact => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-4 p-3 pl-16 border-b border-gray-100 last:border-0 hover:bg-gray-100"
                          >
                            <div className="p-1.5 bg-white rounded-full">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{contact.name}</p>
                              {contact.title && (
                                <p className="text-xs text-gray-500">{contact.title}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="hover:text-pepper-red">
                                  <Mail className="h-4 w-4" />
                                </a>
                              )}
                              {contact.phone && (
                                <a href={`tel:${contact.phone}`} className="hover:text-pepper-red">
                                  <Phone className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openContactModal(company.id, contact)}
                                  className="p-1.5 text-gray-400 hover:text-pepper-red rounded hover:bg-white"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteContact(contact)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-white"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <div className="p-3 pl-16">
                          <button
                            onClick={() => openContactModal(company.id)}
                            className="flex items-center gap-2 text-sm text-pepper-red hover:text-pepper-red/80"
                          >
                            <Plus className="h-4 w-4" />
                            Kontakt hozzáadása
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Company Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={editingCompany ? 'Cég szerkesztése' : 'Új cég'}
        size="lg"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cégnév *</label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                placeholder="Cég neve"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Típus</label>
              <select
                value={companyForm.type}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                {COMPANY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {(companyForm.type === 'supplier' || companyForm.type === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beszállító kategória</label>
                <select
                  value={companyForm.supplier_category}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, supplier_category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
                >
                  <option value="">Válassz...</option>
                  {SUPPLIER_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="text"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cím</label>
              <input
                type="text"
                value={companyForm.address}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weboldal</label>
              <input
                type="text"
                value={companyForm.website}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adószám</label>
              <input
                type="text"
                value={companyForm.tax_number}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, tax_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kapcsolattartónk</label>
              <select
                value={companyForm.our_contact_id}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, our_contact_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              >
                <option value="">Nincs megadva</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
              <textarea
                value={companyForm.notes}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCompanyModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingCompany ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contact Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={editingContact ? 'Kontakt szerkesztése' : 'Új kontakt'}
        size="md"
      >
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Név *</label>
            <input
              type="text"
              value={contactForm.name}
              onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="Kontakt neve"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulus/Pozíció</label>
            <input
              type="text"
              value={contactForm.title}
              onChange={(e) => setContactForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              placeholder="pl. Ügyvezető, Beszerzési vezető"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="text"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
            <textarea
              value={contactForm.notes}
              onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pepper-red"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsContactModalOpen(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {editingContact ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
