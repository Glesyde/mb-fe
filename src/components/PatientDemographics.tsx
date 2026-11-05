import React, { useState, useRef } from "react";
import { Camera, Edit2, Trash2, Search, Eye, Check } from "lucide-react";

const INITIAL_DATA = {
  pt_info: {
    first_name: "John",
    middle_name: "Ade",
    last_name: "Doe",
    gender: "Male",
    date_of_birth: "1990-05-12",
    phone: "08012345678",
    email: "john.doe@email.com",
    address: "12 Medical Street, Lagos",
    marital_status: "Single",
    nationality: "Nigerian",
    state_of_origin: "Delta",
    lga: "Ughelli North",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    nok_full_name: "Abdul Bello",
    nok_relationship: "Husband",
    nok_phone: "07011223344",
    nok_alternate_phone: "08099887766",
    nok_address: "Same as patient",
  },
  medical_profile: {
    blood_group: "O+",
    genotype: "AA",
    known_allergies: "Penicillin",
    chronic_conditions: "Hypertension",
    disability_notes: "",
    special_alerts: "Diabetic – monitor blood sugar",
  },
  emergency_contacts: [
    {
      full_name: "Jane Doe",
      relationship: "Spouse",
      phone: "08098765432",
      alternate_phone: "07011223344",
      address: "12 Medical Street, Lagos",
      is_primary: true,
    },
  ],
  payer: {
    payer_type: "HMO",
    payer_id: "3",
  },
};

const InputField = ({
  label,
  value,
  required = false,
  type = "text",
  readOnly = false,
  className = "",
}: any) => (
  <div className={`flex flex-col ${className}`}>
    <label className="text-[11px] text-slate-500 mb-1 font-medium">
      {required && <span className="text-red-500 mr-0.5">*</span>}
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        defaultValue={value}
        readOnly={readOnly}
        className={`w-full border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none transition-colors ${readOnly ? "bg-slate-50 text-slate-500" : "focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"}`}
      />
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  options = [],
  required = false,
  className = "",
}: any) => (
  <div className={`flex flex-col ${className}`}>
    <label className="text-[11px] text-slate-500 mb-1 font-medium">
      {required && <span className="text-red-500 mr-0.5">*</span>}
      {label}
    </label>
    <select
      defaultValue={value}
      className="w-full border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 bg-white"
    >
      <option value="">-- Select --</option>
      {options.map((opt: any) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const SearchField = ({
  label,
  value,
  required = false,
  className = "",
  onSearch,
}: any) => (
  <div className={`flex flex-col ${className}`}>
    <label className="text-[11px] text-slate-500 mb-1 font-medium">
      {required && <span className="text-red-500 mr-0.5">*</span>}
      {label}
    </label>
    <div className="relative flex">
      <input
        type="text"
        defaultValue={value}
        className="w-full border border-slate-200 border-r-0 rounded-l px-2 py-1.5 text-[13px] outline-none focus:border-brand-primary"
      />
      <button
        type="button"
        onClick={onSearch}
        className="border border-slate-200 rounded-r px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500"
      >
        <Search size={14} />
      </button>
    </div>
  </div>
);

const PatientDemographics: React.FC = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setData((prev) => ({
        ...prev,
        pt_info: { ...prev.pt_info, photo_url: url },
      }));
    }
  };

  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden text-slate-800 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 border-b border-brand-active bg-gradient-to-r from-brand-active/50 to-white">
        <h2 className="text-lg font-bold text-slate-800">
          Patient Demographics
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-brand-primary focus:ring-brand-active0"
            />
            Tia Care Subscription
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Reporting Time</span>
            <input
              type="time"
              className="border border-slate-200 rounded px-2 py-1 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-12 gap-6">
        {/* Main Content Area (Left 10 cols) */}
        <div className="col-span-12 xl:col-span-10 space-y-4">
          {/* Top Row - IDs */}
          <div className="grid grid-cols-4 gap-4">
            <SelectField
              label="Patient Type"
              value="New"
              options={["New", "Returning", "Referral"]}
            />
            <SearchField label="Patient ID" value="MRN-2024-001" />
            <SearchField label="Country ID" value={data.pt_info.nationality} />
            <div className="flex items-end gap-2">
              <SearchField label="Appointment No" value="" className="flex-1" />
              <button className="bg-indigo-500 hover:bg-indigo-600 text-white rounded px-3 py-1.5 text-[13px] flex items-center gap-1.5 h-[32px] transition-colors">
                <Eye size={14} /> Appointments
              </button>
            </div>
          </div>

          {/* Core Name */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex gap-2">
              <SelectField
                label="Title"
                value="Mr"
                options={["Mr", "Mrs", "Miss", "Dr"]}
                className="w-20 shrink-0"
              />
              <InputField
                label="First Name"
                value={data.pt_info.first_name}
                required
                className="flex-1"
              />
            </div>
            <InputField
              label="Middlename"
              value={data.pt_info.middle_name}
              className="col-span-1"
            />
            <InputField
              label="Lastname"
              value={data.pt_info.last_name}
              required
              className="col-span-2 text-brand-primary font-medium"
            />
          </div>

          {/* Demographics row */}
          <div className="grid grid-cols-4 gap-4">
            <SelectField
              label="Gender"
              value={data.pt_info.gender}
              required
              options={["Male", "Female", "Other"]}
            />
            <InputField
              type="date"
              label="Date of Birth"
              value={data.pt_info.date_of_birth}
              required
            />
            <InputField label="Age" value="34" />
            <SelectField
              label="Martial Status"
              value={data.pt_info.marital_status}
              options={["Single", "Married", "Divorced", "Widowed"]}
            />
          </div>

          {/* Medical Info Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 bg-amber-50/30 px-4 py-4 rounded">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Medical Info
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <SelectField
                  label="Blood Group"
                  value={data.medical_profile.blood_group}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                />
                <InputField
                  label="Genotype"
                  value={data.medical_profile.genotype}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-[11px] text-slate-500 mb-1 font-medium">
                    Known Allergies
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-brand-primary bg-white"
                    defaultValue={data.medical_profile.known_allergies}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[11px] text-slate-500 mb-1 font-medium">
                    Chronic Conditions
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-brand-primary bg-white"
                    defaultValue={data.medical_profile.chronic_conditions}
                  />
                </div>
              </div>
            </div>

            {/* Special Alerts - Full Width */}
            <div className="mt-4 flex flex-col">
              <label className="text-[11px] text-slate-500 mb-1 font-medium">
                Special Alerts
              </label>
              <textarea
                className="w-full h-12 border border-slate-200 rounded px-2 py-1 text-[13px] outline-none focus:border-brand-primary bg-white"
                defaultValue={data.medical_profile.special_alerts}
              />
            </div>

            {/* Disability Notes - Full Width */}
            <div className="mt-4 flex flex-col">
              <label className="text-[11px] text-slate-500 mb-1 font-medium">
                Disability Notes
              </label>
              <textarea
                className="w-full h-12 border border-slate-200 rounded px-2 py-1 text-[13px] outline-none focus:border-brand-primary bg-white"
                defaultValue={data.medical_profile.disability_notes}
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Address & Contact
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 flex flex-col">
                <label className="text-[11px] text-slate-500 mb-1 font-medium">
                  <span className="text-red-500 mr-0.5">*</span>Address
                </label>
                <div className="relative flex-1">
                  <textarea
                    className="w-full h-full min-h-[90px] border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    defaultValue={data.pt_info.address}
                  />
                  <button className="absolute right-0 bottom-0 bg-indigo-500 text-white rounded-tl rounded-br p-1 hover:bg-indigo-600">
                    <Eye size={12} />
                  </button>
                </div>
              </div>

              <div className="col-span-3 grid grid-cols-3 gap-4">
                <SelectField
                  label="Nationality"
                  value={data.pt_info.nationality}
                  required
                  options={["Nigerian", "Ghanaian", "Kenyan", "Other"]}
                  className="col-span-1"
                />
                <SelectField
                  label="State of Origin"
                  value={data.pt_info.state_of_origin}
                  required
                  options={["Lagos", "Delta", "Abuja", "Kano"]}
                  className="col-span-1"
                />
                <SelectField
                  label="LGA"
                  value={data.pt_info.lga}
                  required
                  options={["Ikeja", "Ughelli North", "Garki"]}
                  className="col-span-1"
                />

                <InputField
                  label="Email"
                  value={data.pt_info.email}
                  type="email"
                  required
                  className="col-span-1"
                />
                <div className="col-span-1 relative flex items-end">
                  <InputField
                    label="Phone"
                    value={data.pt_info.phone}
                    required
                    className="w-full"
                  />
                  <button className="absolute right-0 bottom-0 border-l border-slate-200 bg-indigo-500 text-white p-2 rounded-r hover:bg-indigo-600 mb-[1px] mr-[1px]">
                    <Eye size={13} />
                  </button>
                </div>
                <InputField
                  label="Alternate Contact"
                  value={data.emergency_contacts[0].alternate_phone}
                  className="col-span-1"
                />
              </div>
            </div>
          {/* Next of Kin Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 bg-indigo-50/20 px-4 py-4 rounded">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Next of Kin</h3>
            <div className="grid grid-cols-4 gap-4">
              <InputField
                label="Full Name"
                value={data.pt_info.nok_full_name}
                className="col-span-2"
              />
              <InputField
                label="Relationship"
                value={data.pt_info.nok_relationship}
              />
              <InputField label="Phone" value={data.pt_info.nok_phone} />
              <InputField
                label="Alt. Phone"
                value={data.pt_info.nok_alternate_phone}
              />
              <InputField
                label="Address"
                value={data.pt_info.nok_address}
                className="col-span-3"
              />
            </div>
          </div>

          {/* Medical Profile / Extra Data */}
          <div className="mt-4 pt-4 border-t border-slate-100 bg-brand-active/30 -mx-4 px-4 pb-4 rounded-b">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Encounter & Medical Details
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <SelectField
                label="Payer Scheme"
                required
                value={data.payer.payer_type}
                options={["Self Pay", "HMO", "NHIS", "Corporate"]}
              />
              <SelectField
                label="Sponsor / HMO Name"
                required
                value="Reliance Health"
                options={["Reliance Health", "AXA Mansard", "Hygeia"]}
              />
              <InputField label="Payer ID" value={data.payer.payer_id} />
              <SearchField
                label="Doctor/Speciality"
                value="Dr. Sarah / Cardiology"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Photo Upload (2 cols) */}
        <div className="col-span-12 xl:col-span-2 border-l border-slate-100 pl-6 flex flex-col items-center">
          <div
            className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 mb-3 relative group overflow-hidden bg-cover bg-center rounded-sm"
            style={{ backgroundImage: `url(${data.pt_info.photo_url})` }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-white text-xs font-bold px-3 py-1.5 border border-white rounded hover:bg-white/20"
              >
                Change Photo
              </button>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="flex items-center gap-4 text-slate-400 mb-6 border-b border-slate-100 pb-4 w-full justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-slate-700 transition-colors"
            >
              <Camera size={16} />
            </button>
            <button className="hover:text-slate-700 transition-colors">
              <Edit2 size={16} />
            </button>
            <button
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  pt_info: { ...prev.pt_info, photo_url: "" },
                }))
              }
              className="hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-y-3 gap-x-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-brand-primary focus:ring-brand-active0"
              />
              International
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-brand-primary focus:ring-brand-active0"
              />
              Insurance
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-brand-primary focus:ring-brand-active0"
              />
              MLC
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-brand-primary focus:ring-brand-active0"
              />
              VIP
            </label>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 mt-4">
        <button className="px-5 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded border border-transparent transition-colors">
          Clear all
        </button>
        <button className="px-6 py-2 text-sm font-bold text-white bg-cyan-500 hover:bg-cyan-600 rounded flex items-center gap-2 shadow-sm shadow-cyan-200 transition-colors">
          Submit <Check size={16} />
        </button>
      </div>
    </div>
  );
};

export default PatientDemographics;
