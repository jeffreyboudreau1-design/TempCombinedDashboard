'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useLookups } from '@/hooks/useLookups';

export default function TruancyCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const { currentUser } = useAuth();
  const { schools, schoolGrades } = useLookups();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Demographics');

  // Arrays for Grids
  const [allSSY, setAllSSY] = useState<any[]>([]);
  const [caseDates, setCaseDates] = useState<any[]>([]);
  const [yearDefinitions, setYearDefinitions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsToDelete, setContactsToDelete] = useState<string[]>([]);
  const [student, setStudent] = useState<any>(null);

  // Demographics Flat Data
  const [formData, setFormData] = useState({
    StudentFirstName: '',
    StudentLastName: '',
    StudentMid: '',
    StudentBirthdate: '',
    StudentSex: '',
    StudentEthnicity: '',
    StudentAddress: '',
    StudentCity: '',
    StudentState: 'IL',
    StudentZip: '',
    ParentSignedIOEP: 'No',
    ReasonNoIOEP: '',
    TransportationConsent: 'No',
    FamilyComment: '',
    StudentPrimaryReferral: ''
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    Emergency: false,
    ContactLast: '',
    ContactFirst: '',
    ContactMiddle: '',
    ContactRelationship: '',
    ContactEmail: '',
    ContactPhone: '',
    ContactEmerPhone: '',
    ContactESL: false,
    IsPrimary: false
  });

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchData = async () => {
      try {
        const [studentData, ssyList, contactsList, years, cdList] = await Promise.all([
          api.get(`/STUDENTS/${resolvedParams.id}`) as Promise<any>,
          api.get('/StudentSchoolYear') as Promise<any[]>,
          api.get('/StudentContact') as Promise<any[]>,
          api.get('/SchoolYear') as Promise<any[]>,
          api.get('/CaseEntryExitDates') as Promise<any[]>
        ]);

        setYearDefinitions(years);
        setStudent(studentData);

        const caseSsyList = ssyList.filter((y: any) => y.StudentRecordID === resolvedParams.id);
        setAllSSY(caseSsyList);
        
        const myCaseDates = cdList.filter((c: any) => c.StuSchYrID && caseSsyList.find(s => s.id === c.StuSchYrID));
        
        // Auto-migrate legacy pre-attendance seed data from STUDENT object if no CaseEntryExitDates exist
        if (myCaseDates.length === 0) {
           myCaseDates.push({
             id: 'CD-TEMP-INITIAL',
             EntryDate: '',
             ExitDate: '',
             ReasonForExit: '',
             PreAttendancePresent: Number(studentData.PreAttendancePresent) || 0,
             PreAttendanceAbsent: Number(studentData.PreAttendanceAbsent) || 0,
             PreAttendanceExcused: Number(studentData.PreAttendanceExcused) || 0,
             PreAttendanceUnexcused: Number(studentData.PreAttendanceUnexcused) || 0,
             PreAttendanceSuspended: Number(studentData.PreAttendanceSuspended) || 0,
             PreAttendanceTardy: Number(studentData.PreAttendanceTardy) || 0,
             LastYearsUnexcused: Number(studentData.LastYearsUnexcused) || 0,
             StuSchYrID: caseSsyList[0]?.id || '',
             OrgID: "ORG-IKAN-01"
           });
        }

        setCaseDates(myCaseDates);

        const caseContacts = contactsList.filter((c: any) => c.StudentRecordID === resolvedParams.id);
        setContacts(caseContacts);

        setFormData({
          StudentFirstName: studentData.StudentFirstName || '',
          StudentLastName: studentData.StudentLastName || '',
          StudentMid: studentData.StudentMid || '',
          StudentBirthdate: studentData.StudentBirthdate || '',
          StudentSex: studentData.StudentSex || '',
          StudentEthnicity: studentData.StudentEthnicity || '',
          StudentAddress: studentData.StudentAddress || '',
          StudentCity: studentData.StudentCity || '',
          StudentState: studentData.StudentState || 'IL',
          StudentZip: studentData.StudentZip || '',
          ParentSignedIOEP: studentData.ParentSignedIOEP || 'No',
          ReasonNoIOEP: studentData.ReasonNoIOEP || '',
          TransportationConsent: studentData.TransportationConsent || 'No',
          FamilyComment: studentData.FamilyComment || '',
          StudentPrimaryReferral: studentData.StudentPrimaryReferral || ''
        });

      } catch (err) {
        console.error(err);
        alert("Failed to load case data.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [resolvedParams.id, currentUser]);

  const isAdmin = currentUser?.Role === 'SuperAdmin' || currentUser?.Role === 'School Admin. Assist.' || currentUser?.Role === 'DeptAdmin';
  const isCaseworker = currentUser?.Role === 'Caseworker';
  const canEditFull = isAdmin;
  const canEditAttendance = isAdmin || isCaseworker;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSSYChange = (id: string, field: string, value: any) => {
    setAllSSY(allSSY.map(ssy => ssy.id === id ? { ...ssy, [field]: value } : ssy));
  };

  const handleCaseDateChange = (id: string, field: string, value: any) => {
    setCaseDates(caseDates.map(cd => cd.id === id ? { ...cd, [field]: value } : cd));
  };

  const handleSSYArrayToggle = (id: string, field: string, value: string) => {
    setAllSSY(allSSY.map(ssy => {
      if (ssy.id !== id) return ssy;
      const currentArr = ssy[field] || [];
      const newArr = currentArr.includes(value) ? currentArr.filter((v: string) => v !== value) : [...currentArr, value];
      return { ...ssy, [field]: newArr };
    }));
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setNewContact({ ...newContact, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setNewContact({ ...newContact, [name]: value });
    }
  };

  const addContact = () => {
    setContacts([...contacts, { ...newContact, id: `TEMP-${Date.now()}` }]);
    setIsModalOpen(false);
    setNewContact({
      Emergency: false, ContactLast: '', ContactFirst: '', ContactMiddle: '', ContactRelationship: '',
      ContactEmail: '', ContactPhone: '', ContactEmerPhone: '', ContactESL: false, IsPrimary: false
    });
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
    if (!id.startsWith('TEMP-')) {
      setContactsToDelete([...contactsToDelete, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (canEditFull || canEditAttendance) {
         const existingStudent = await api.get(`/STUDENTS/${resolvedParams.id}`) as any;
         const studentPayload = { ...existingStudent, ...formData };
         await api.put(`/STUDENTS/${resolvedParams.id}`, studentPayload);
      }

      if (canEditFull) {
        // Save SSY
        for (const ssy of allSSY) {
          if (ssy.id.startsWith('SSY-TEMP-')) {
             await api.post('/StudentSchoolYear', { ...ssy, id: ssy.id.replace('SSY-TEMP-', 'SSY-') });
          } else {
             await api.put(`/StudentSchoolYear/${ssy.id}`, ssy);
          }
        }
        
        // Save Contacts
        for (const c of contacts) {
          if (c.id.startsWith('TEMP-')) {
            const payload = { ...c, id: `CT-${Date.now()}-${Math.random().toString(36).substring(2,9)}`, StudentRecordID: resolvedParams.id, OrgID: "ORG-IKAN-01" };
            await api.post('/StudentContact', payload);
          } else {
            await api.put(`/StudentContact/${c.id}`, c);
          }
        }
        for (const delId of contactsToDelete) {
          await api.delete(`/StudentContact/${delId}`);
        }
      }

      if (canEditAttendance || canEditFull) {
         for (const cd of caseDates) {
           if (cd.id.startsWith('CD-TEMP-')) {
             await api.post('/CaseEntryExitDates', { ...cd, id: cd.id.replace('CD-TEMP-', 'CD-') });
           } else {
             await api.put(`/CaseEntryExitDates/${cd.id}`, cd);
           }
         }
      }

      alert("Case updated successfully.");
      setIsEditing(false);
      setContactsToDelete([]);
      window.location.reload();

    } catch (err) {
      console.error(err);
      alert("Failed to update Case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !currentUser) return <div style={{ color: '#fff', padding: '2rem' }}>Loading Case Details...</div>;

  const inputStyle = { padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.9)', color: '#000', width: '100%' };
  const disabledStyle = { ...inputStyle, background: 'transparent', border: 'none', color: '#fff', padding: '0.5rem 0', fontWeight: 'normal' };
  const getStyle = (canEdit: boolean) => isEditing && canEdit ? inputStyle : disabledStyle;
  
  const getYearLabel = (yearId: string) => {
    const yr = yearDefinitions.find(y => y.id === yearId);
    return yr ? yr.YearLabel : yearId;
  };
  
  const getSchoolName = (schoolId: string) => {
    const sc = schools.find(s => s.id === schoolId);
    return sc ? sc.SchoolName : schoolId;
  };

  const tabs = ['Demographics', 'Court Related', 'Outcomes', 'Characteristics', 'Notes', 'Act/Serv Current Yr'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <div>
           <h2 style={{ margin: 0, color: '#fff', fontSize: '1.8rem' }}>{student?.StudentFirstName} {student?.StudentLastName}</h2>
           <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Student ID: {student?.StudentID}</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isEditing && isAdmin && (
            <button 
              type="button"
              onClick={() => setIsEditing(true)}
              style={{ padding: '0.5rem 1rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Edit Case
            </button>
          )}
          <button 
            type="button"
            onClick={() => router.push('/truancy')}
            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Persistent Header Grid (Entry / Exit) */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#fcd34d' }}>Enrollment Record</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Entry Date</th>
                <th style={{ padding: '0.5rem' }}>Exit Date</th>
                <th style={{ padding: '0.5rem' }}>Reason For Exit</th>
              </tr>
            </thead>
            <tbody>
              {caseDates.map((cd) => (
                <tr key={cd.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem' }}>
                     <input type="date" disabled={!isEditing || !canEditFull} value={cd.EntryDate || ''} onChange={(e) => handleCaseDateChange(cd.id, 'EntryDate', e.target.value)} style={getStyle(canEditFull)} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                     <input type="date" disabled={!isEditing || !canEditFull} value={cd.ExitDate || ''} onChange={(e) => handleCaseDateChange(cd.id, 'ExitDate', e.target.value)} style={getStyle(canEditFull)} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                     <select disabled={!isEditing || !canEditFull} value={cd.ReasonForExit || ''} onChange={(e) => handleCaseDateChange(cd.id, 'ReasonForExit', e.target.value)} style={getStyle(canEditFull)}>
                       <option value="">--Active--</option>
                       <option value="Moved out of district">Moved out of district</option>
                       <option value="Dropout">Dropout</option>
                       <option value="Graduated">Graduated</option>
                     </select>
                  </td>
                </tr>
              ))}
              {caseDates.length === 0 && <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No enrollment records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
         {tabs.map(tab => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             type="button"
             style={{ 
               padding: '0.5rem 1.5rem', 
               background: activeTab === tab ? '#fcd34d' : 'rgba(255,255,255,0.1)', 
               color: activeTab === tab ? '#000' : '#fff',
               border: 'none', 
               borderRadius: '4px', 
               cursor: 'pointer',
               fontWeight: activeTab === tab ? 'bold' : 'normal',
               whiteSpace: 'nowrap'
             }}
           >
             {tab}
           </button>
         ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* DEMOGRAPHICS TAB */}
        {activeTab === 'Demographics' && (
          <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
            <h3 style={{ marginTop: 0, color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Demographics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>First Name <input disabled={!isEditing || !canEditFull} name="StudentFirstName" value={formData.StudentFirstName} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>Middle Name <input disabled={!isEditing || !canEditFull} name="StudentMid" value={formData.StudentMid} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>Last Name <input disabled={!isEditing || !canEditFull} name="StudentLastName" value={formData.StudentLastName} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>Birthdate <input type="date" disabled={!isEditing || !canEditFull} name="StudentBirthdate" value={formData.StudentBirthdate} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>Sex 
                <select disabled={!isEditing || !canEditFull} name="StudentSex" value={formData.StudentSex} onChange={handleChange} style={getStyle(canEditFull)}>
                  <option value="">--Select--</option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>Ethnicity 
                <select disabled={!isEditing || !canEditFull} name="StudentEthnicity" value={formData.StudentEthnicity} onChange={handleChange} style={getStyle(canEditFull)}>
                  <option value="">--Select--</option>
                  <option value="Hispanic/Latino">Hispanic/Latino</option>
                  <option value="White">White</option>
                  <option value="Black or African American">Black or African American</option>
                  <option value="Asian">Asian</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem', gridColumn: 'span 2' }}>Address <input disabled={!isEditing || !canEditFull} name="StudentAddress" value={formData.StudentAddress} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>City <input disabled={!isEditing || !canEditFull} name="StudentCity" value={formData.StudentCity} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>State <input disabled={!isEditing || !canEditFull} name="StudentState" value={formData.StudentState} onChange={handleChange} style={getStyle(canEditFull)} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem' }}>Zip Code <input disabled={!isEditing || !canEditFull} name="StudentZip" value={formData.StudentZip} onChange={handleChange} style={getStyle(canEditFull)} /></label>
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fcd34d' }}>School History</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>School Year</th>
                    <th style={{ padding: '0.5rem' }}>School</th>
                    <th style={{ padding: '0.5rem' }}>Grade Level</th>
                    <th style={{ padding: '0.5rem' }}>Credits Earned</th>
                    <th style={{ padding: '0.5rem' }}>Special Ed</th>
                    <th style={{ padding: '0.5rem' }}>School Entry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allSSY.map((ssy) => (
                    <tr key={ssy.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem' }}>{getYearLabel(ssy.SchoolYearID)}</td>
                      <td style={{ padding: '0.5rem' }}>
                         <select disabled={!isEditing || !canEditFull} value={ssy.SchoolID || ''} onChange={(e) => handleSSYChange(ssy.id, 'SchoolID', e.target.value)} style={getStyle(canEditFull)}>
                           <option value="">--Select School--</option>
                           {schools.map(s => <option key={s.id} value={s.id}>{s.SchoolName}</option>)}
                         </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                         <select disabled={!isEditing || !canEditFull} value={ssy.GradeLevel || ''} onChange={(e) => handleSSYChange(ssy.id, 'GradeLevel', e.target.value)} style={getStyle(canEditFull)}>
                           <option value="">--Select--</option>
                           {['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => <option key={g} value={g}>{g}</option>)}
                         </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                         <input type="number" disabled={!isEditing || !canEditFull} value={ssy.CreditsEarned || 0} onChange={(e) => handleSSYChange(ssy.id, 'CreditsEarned', Number(e.target.value))} style={getStyle(canEditFull)} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                         <select disabled={!isEditing || !canEditFull} value={ssy.SpecialEd || 'No'} onChange={(e) => handleSSYChange(ssy.id, 'SpecialEd', e.target.value)} style={getStyle(canEditFull)}>
                           <option value="Yes">Yes</option><option value="No">No</option>
                         </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                         <input type="date" disabled={!isEditing || !canEditFull} value={ssy.SchoolEntryDate || ''} onChange={(e) => handleSSYChange(ssy.id, 'SchoolEntryDate', e.target.value)} style={getStyle(canEditFull)} />
                      </td>
                    </tr>
                  ))}
                  {allSSY.length === 0 && <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No school history found.</td></tr>}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#fcd34d' }}>Parental Contacts</h3>
              {isEditing && canEditFull && (
                <button type="button" onClick={() => setIsModalOpen(true)} style={{ padding: '0.5rem 1rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  + Add Additional Contact
                </button>
              )}
            </div>
            
            {contacts.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>No contacts added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {contacts.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 'bold' }}>{c.ContactFirst} {c.ContactLast} <span style={{ fontSize: '0.8rem', color: '#fcd34d' }}>({c.ContactRelationship})</span></div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Phone: {c.ContactPhone} | Email: {c.ContactEmail} {c.IsPrimary ? '| PRIMARY' : ''}</div>
                    </div>
                    {isEditing && canEditFull && (
                      <button type="button" onClick={() => removeContact(c.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <h4 style={{ margin: '2rem 0 0.5rem 0', color: '#fcd34d', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>Primary Referral</h4>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
               <label style={{ display: 'flex', flexDirection: 'column', color: '#fff', fontSize: '0.85rem', width: '200px' }}>Primary Referral 
                 <select disabled={!isEditing || !canEditFull} name="StudentPrimaryReferral" value={formData.StudentPrimaryReferral} onChange={handleChange} style={getStyle(canEditFull)}>
                   <option value="">--Select--</option>
                   <option value="Truant">Truant</option>
                   <option value="Chronic Truant">Chronic Truant</option>
                   <option value="Dropout">Dropout</option>
                 </select>
               </label>
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fcd34d' }}>Secondary Referral Options</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>School Year</th>
                    {['Low Achievement', 'High Failure Rate', 'Teen Parent', 'Credit Deficient', 'Tardiness', 'Low Income', 'Drugs AndOr Alcohol'].map(r => (
                      <th key={r} style={{ padding: '0.5rem', textAlign: 'center' }}>{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSSY.map((ssy) => (
                    <tr key={ssy.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{getYearLabel(ssy.SchoolYearID)}</td>
                      {['Low Achievement', 'High Failure Rate', 'Teen Parent', 'Credit Deficient', 'Tardiness', 'Low Income', 'Drugs AndOr Alcohol'].map(reason => (
                        <td key={reason} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            disabled={!isEditing || !canEditFull}
                            checked={(ssy.SecondaryReferral || []).includes(reason)}
                            onChange={() => handleSSYArrayToggle(ssy.id, 'SecondaryReferral', reason)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {allSSY.length === 0 && <tr><td colSpan={8} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No records found.</td></tr>}
                </tbody>
              </table>
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fcd34d' }}>Pre-Attendance Records</h4>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Entry Date</th>
                    <th style={{ padding: '0.5rem' }}>Exit Date</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Present</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Excused</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Unexcused</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Suspended</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Absent</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Tardy</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Last Yrs Unex.</th>
                  </tr>
                </thead>
                <tbody>
                  {caseDates.map((cd) => (
                    <tr key={cd.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem' }}>{cd.EntryDate || '-'}</td>
                      <td style={{ padding: '0.5rem' }}>{cd.ExitDate || '-'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.PreAttendancePresent || 0} onChange={(e) => handleCaseDateChange(cd.id, 'PreAttendancePresent', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.PreAttendanceExcused || 0} onChange={(e) => handleCaseDateChange(cd.id, 'PreAttendanceExcused', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.PreAttendanceUnexcused || 0} onChange={(e) => handleCaseDateChange(cd.id, 'PreAttendanceUnexcused', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.PreAttendanceSuspended || 0} onChange={(e) => handleCaseDateChange(cd.id, 'PreAttendanceSuspended', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.PreAttendanceAbsent || 0} onChange={(e) => handleCaseDateChange(cd.id, 'PreAttendanceAbsent', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.PreAttendanceTardy || 0} onChange={(e) => handleCaseDateChange(cd.id, 'PreAttendanceTardy', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                         <input type="number" min="0" disabled={!isEditing || !canEditAttendance} value={cd.LastYearsUnexcused || 0} onChange={(e) => handleCaseDateChange(cd.id, 'LastYearsUnexcused', Number(e.target.value))} style={{ ...getStyle(canEditAttendance), textAlign: 'center' }} />
                      </td>
                    </tr>
                  ))}
                  {caseDates.length === 0 && <tr><td colSpan={9} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No Pre-Attendance records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OUTCOMES TAB */}
        {activeTab === 'Outcomes' && (
          <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fcd34d' }}>Primary Academic Outcomes</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>School Year</th>
                    {['Graduated From High School', 'Received GED Certificate', 'Promoted To next Grade'].map(r => (
                      <th key={r} style={{ padding: '0.5rem', textAlign: 'center' }}>{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSSY.map((ssy) => (
                    <tr key={ssy.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{getYearLabel(ssy.SchoolYearID)}</td>
                      {['Graduated From High School', 'Received GED Certificate', 'Promoted To next Grade'].map(reason => (
                        <td key={reason} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            disabled={!isEditing || !canEditFull}
                            checked={(ssy.PrimaryAcademicOutcomes || []).includes(reason)}
                            onChange={() => handleSSYArrayToggle(ssy.id, 'PrimaryAcademicOutcomes', reason)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {allSSY.length === 0 && <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No records found.</td></tr>}
                </tbody>
              </table>
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fcd34d' }}>Other Outcomes</h4>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>School Year</th>
                    {['Dropped out of School', 'Voluntarily Discontinued', 'Removed from TAOEP', 'Moved out of the District', 'Retained in School'].map(r => (
                      <th key={r} style={{ padding: '0.5rem', textAlign: 'center' }}>{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSSY.map((ssy) => (
                    <tr key={ssy.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{getYearLabel(ssy.SchoolYearID)}</td>
                      {['Dropped out of School', 'Voluntarily Discontinued', 'Removed from TAOEP', 'Moved out of the District', 'Retained in School'].map(reason => (
                        <td key={reason} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            disabled={!isEditing || !canEditFull}
                            checked={(ssy.OtherOutcomes || []).includes(reason)}
                            onChange={() => handleSSYArrayToggle(ssy.id, 'OtherOutcomes', reason)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {allSSY.length === 0 && <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>No records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isEditing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingBottom: '3rem', gap: '1rem' }}>
            <button 
              type="button" 
              onClick={() => { setIsEditing(false); setContactsToDelete([]); }}
              style={{ padding: '1rem 2rem', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '1rem 3rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
