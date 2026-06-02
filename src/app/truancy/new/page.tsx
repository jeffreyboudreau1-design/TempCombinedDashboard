'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useLookups } from '@/hooks/useLookups';
import { AccessToggle } from '@/types/schema';

export default function NewTruancyCasePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { schools, schoolGrades } = useLookups();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);

  // Section 1 & 3: Main Form Data
  const [formData, setFormData] = useState({
    // Demographics
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
    
    // School Details
    GradeLevel: '9th',
    HomeSchool: '',
    SchoolYearID: '',
    CaseWorker: 'EMP-08',
    
    // Case Info
    StudentPrimaryReferral: '',
    SecondaryReferral: [] as string[],
    ParentSignedIOEP: 'No',
    ReasonNoIOEP: '',
    TransportationConsent: 'No',
    FamilyComment: '',
    SchoolEntryDate: new Date().toISOString().split('T')[0],

    // Pre-Attendance
    PreAttendanceTotal: 0,
    PreAttendancePresent: 0,
    PreAttendanceAbsent: 0,
    PreAttendanceExcused: 0,
    PreAttendanceUnexcused: 0,
    PreAttendanceSuspended: 0,
    PreAttendanceTardy: 0,
    LastYearsUnexcused: 0
  });

  const availableSchools = useMemo(() => {
    if (!formData.GradeLevel) return schools;
    const allowedSchoolIds = schoolGrades.filter(sg => sg.GradeLevel === formData.GradeLevel).map(sg => sg.SchoolID);
    return schools.filter(s => allowedSchoolIds.includes(s.id));
  }, [formData.GradeLevel, schools, schoolGrades]);

  const [yearDefinitions, setYearDefinitions] = useState<any[]>([]);
  
  // Section 2: Contacts
  const [contacts, setContacts] = useState<any[]>([]);
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
    api.get('/SchoolYear').then((res: any) => {
      setYearDefinitions(res);
      const active = res.find((y: any) => y.IsActiveYear === 'Yes');
      if (active) {
        setFormData(f => ({ ...f, SchoolYearID: active.id }));
      }
    }).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSecondaryReferralToggle = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      SecondaryReferral: prev.SecondaryReferral.includes(reason)
        ? prev.SecondaryReferral.filter(r => r !== reason)
        : [...prev.SecondaryReferral, reason]
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
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const studentId = generateId();
      const schoolYearId = formData.SchoolYearID;
      
      const payloadData: any = { ...formData };
      delete payloadData.SchoolYearID;

      // 1. Create Student record tagged with Truancy Dashboard
      const newStudent: any = {
        ...payloadData,
        id: studentId,
        Dashboard: 'Truancy',
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };
      delete newStudent.SecondaryReferral;
      delete newStudent.SchoolEntryDate;
      await api.post('/STUDENTS', newStudent);

      // 2. Create StudentSchoolYear record 
      const newStudentSchoolYear = {
        id: generateId(),
        OrgID: "ORG-IKAN-01", 
        StudentRecordID: studentId,
        SchoolYearID: schoolYearId,
        CaseNo: Math.floor(Math.random() * 10000),
        SchoolID: formData.HomeSchool,
        GradeLevel: formData.GradeLevel,
        SchoolEntryDate: formData.SchoolEntryDate,
        CaseWorker: formData.CaseWorker,
        SecondaryReferral: formData.SecondaryReferral,
        CreditsEarned: 0,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };
      await api.post('/StudentSchoolYear', newStudentSchoolYear);

      // 3. Create all attached contacts
      for (const c of contacts) {
        const contactPayload = {
          ...c,
          id: generateId(), // replace temp ID
          StudentRecordID: studentId,
          OrgID: "ORG-IKAN-01",
        };
        await api.post('/StudentContact', contactPayload);
      }

      setCreatedStudentId(studentId);
    } catch (err) {
      console.error(err);
      alert("Failed to open Truancy case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) return null;

  if (createdStudentId) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#fcd34d' }}>Truancy Case Opened!</h2>
        <p style={{ marginBottom: '2rem', color: '#fff' }}>Case successfully registered under the active school year.</p>
        <button 
          onClick={() => router.push('/truancy')}
          style={{ padding: '0.75rem 1.5rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Return to Open Cases
        </button>
      </div>
    );
  }

  const inputStyle = { padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.9)', color: '#000' };
  const labelStyle = { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
      <h2 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#fff' }}>
        Open New Truancy Case
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* SECTION 1: Demographics & Case Info */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Student Demographics & Case Info</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <label style={labelStyle}>First Name * <input required name="StudentFirstName" value={formData.StudentFirstName} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Middle Name <input name="StudentMid" value={formData.StudentMid} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Last Name * <input required name="StudentLastName" value={formData.StudentLastName} onChange={handleChange} style={inputStyle} /></label>
            
            <label style={labelStyle}>Birthdate <input type="date" name="StudentBirthdate" value={formData.StudentBirthdate} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Sex 
              <select name="StudentSex" value={formData.StudentSex} onChange={handleChange} style={inputStyle}>
                <option value="">--Select--</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
            </label>
            <label style={labelStyle}>Ethnicity 
              <select name="StudentEthnicity" value={formData.StudentEthnicity} onChange={handleChange} style={inputStyle}>
                <option value="">--Select--</option>
                <option value="Hispanic/Latino">Hispanic/Latino</option>
                <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                <option value="Asian">Asian</option>
                <option value="Black or African American">Black or African American</option>
                <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                <option value="White">White</option>
                <option value="Two or More Races">Two or More Races</option>
              </select>
            </label>

            <label style={{ ...labelStyle, gridColumn: 'span 3' }}>Address <input name="StudentAddress" value={formData.StudentAddress} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>City <input name="StudentCity" value={formData.StudentCity} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>State <input name="StudentState" value={formData.StudentState} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Zip Code <input name="StudentZip" value={formData.StudentZip} onChange={handleChange} style={inputStyle} /></label>
          </div>

          <h4 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>School & Enrollment</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <label style={labelStyle}>Grade Level *
              <select required name="GradeLevel" value={formData.GradeLevel} onChange={handleChange} style={inputStyle}>
                {['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Home School *
              <select required name="HomeSchool" value={formData.HomeSchool} onChange={handleChange} style={inputStyle}>
                <option value="">--Select School--</option>
                {availableSchools.map(s => <option key={s.id} value={s.id}>{s.SchoolName}</option>)}
              </select>
            </label>
            <label style={labelStyle}>School Year *
              <select required name="SchoolYearID" value={formData.SchoolYearID} onChange={handleChange} style={inputStyle}>
                <option value="">--Select Year--</option>
                {yearDefinitions.map(y => <option key={y.id} value={y.id}>{y.YearLabel}</option>)}
              </select>
            </label>
            <label style={labelStyle}>School Entry Date *
              <input type="date" required name="SchoolEntryDate" value={formData.SchoolEntryDate} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>Case Worker *
              <select required name="CaseWorker" value={formData.CaseWorker} onChange={handleChange} style={inputStyle}>
                <option value="EMP-08">Bradley Caseworker</option>
              </select>
            </label>
          </div>

          <h4 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Case Documentation</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <label style={labelStyle}>Primary Referral 
              <select required name="StudentPrimaryReferral" value={formData.StudentPrimaryReferral} onChange={handleChange} style={inputStyle}>
                <option value="">--Select--</option>
                <option value="Truant">Truant</option>
                <option value="Chronic Truant">Chronic Truant</option>
                <option value="Dropout">Dropout</option>
                <option value="Potential Dropout">Potential Dropout</option>
              </select>
            </label>
            <label style={labelStyle}>Parent Signed IOEP 
              <select name="ParentSignedIOEP" value={formData.ParentSignedIOEP} onChange={handleChange} style={inputStyle}>
                <option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
            <label style={labelStyle}>Transportation Consent 
              <select name="TransportationConsent" value={formData.TransportationConsent} onChange={handleChange} style={inputStyle}>
                <option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: 'span 3' }}>Reason No IOEP <input name="ReasonNoIOEP" value={formData.ReasonNoIOEP} onChange={handleChange} style={inputStyle} /></label>
            
            <div style={{ gridColumn: 'span 3', marginTop: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Secondary Referral</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {[
                  'Low Achievement', 'High Failure Rate', 'Teen Parent', 'Credit Deficient', 'Tardiness',
                  'Low Income', 'Physical or emotional health problems', 'Court or Law mandated participation', 'Drugs AndOr Alcohol'
                ].map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.SecondaryReferral.includes(reason)}
                      onChange={() => handleSecondaryReferralToggle(reason)}
                    />
                    {reason}
                  </label>
                ))}
              </div>
            </div>

            <label style={{ ...labelStyle, gridColumn: 'span 3' }}>Family Comment <textarea name="FamilyComment" value={formData.FamilyComment} onChange={handleChange} style={{ ...inputStyle, minHeight: '60px' }} /></label>
          </div>
        </div>

        {/* SECTION 2: Contacts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#fcd34d' }}>Parental Contacts</h3>
            <button type="button" onClick={() => setIsModalOpen(true)} style={{ padding: '0.5rem 1rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
              + Add Additional Contact
            </button>
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
                  <button type="button" onClick={() => removeContact(c.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: Pre Attendance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: '#fcd34d', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Pre-Attendance Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <label style={labelStyle}>Total Possible Days <input type="number" min="0" name="PreAttendanceTotal" value={formData.PreAttendanceTotal} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Present <input type="number" min="0" name="PreAttendancePresent" value={formData.PreAttendancePresent} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Absent <input type="number" min="0" name="PreAttendanceAbsent" value={formData.PreAttendanceAbsent} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Excused <input type="number" min="0" name="PreAttendanceExcused" value={formData.PreAttendanceExcused} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Unexcused <input type="number" min="0" name="PreAttendanceUnexcused" value={formData.PreAttendanceUnexcused} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Suspended <input type="number" min="0" name="PreAttendanceSuspended" value={formData.PreAttendanceSuspended} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Tardy <input type="number" min="0" name="PreAttendanceTardy" value={formData.PreAttendanceTardy} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Last Year's Unexcused <input type="number" min="0" name="LastYearsUnexcused" value={formData.LastYearsUnexcused} onChange={handleChange} style={inputStyle} /></label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingBottom: '3rem' }}>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ padding: '1rem 3rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
          >
            {isSubmitting ? 'Opening Case...' : 'Open Truancy Case'}
          </button>
        </div>

      </form>

      {/* CONTACT MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', width: '600px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#fcd34d' }}>Add Parent / Guardian Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <label style={labelStyle}>First Name <input name="ContactFirst" value={newContact.ContactFirst} onChange={handleContactChange} style={inputStyle} /></label>
              <label style={labelStyle}>Last Name <input name="ContactLast" value={newContact.ContactLast} onChange={handleContactChange} style={inputStyle} /></label>
              <label style={labelStyle}>Lives With / Relationship 
                <select name="ContactRelationship" value={newContact.ContactRelationship} onChange={handleContactChange} style={inputStyle}>
                  <option value="">--Select--</option>
                  <option value="Both Parents - Father">Both Parents - Father</option>
                  <option value="Both Parents - Mother">Both Parents - Mother</option>
                  <option value="Single Parent - Mother">Single Parent - Mother</option>
                  <option value="Single Parent - Father">Single Parent - Father</option>
                  <option value="Foster Care">Foster Care</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label style={labelStyle}>Email <input type="email" name="ContactEmail" value={newContact.ContactEmail} onChange={handleContactChange} style={inputStyle} /></label>
              <label style={labelStyle}>Phone <input name="ContactPhone" value={newContact.ContactPhone} onChange={handleContactChange} style={inputStyle} /></label>
              <label style={labelStyle}>Emergency Phone <input name="ContactEmerPhone" value={newContact.ContactEmerPhone} onChange={handleContactChange} style={inputStyle} /></label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer', marginTop: '1rem' }}>
                <input type="checkbox" name="IsPrimary" checked={newContact.IsPrimary} onChange={handleContactChange} />
                Primary Contact?
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer', marginTop: '1rem' }}>
                <input type="checkbox" name="Emergency" checked={newContact.Emergency} onChange={handleContactChange} />
                Emergency Contact?
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer', marginTop: '1rem' }}>
                <input type="checkbox" name="ContactESL" checked={newContact.ContactESL} onChange={handleContactChange} />
                ESL Needed?
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={addContact} disabled={!newContact.ContactLast} style={{ padding: '0.5rem 1rem', background: '#fcd34d', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add to Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
