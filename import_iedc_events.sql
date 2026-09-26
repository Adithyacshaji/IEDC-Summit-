-- =========================================================================
-- SQL Query Script for IEDC Summit Events Database Import
-- Source CSV: C:\Users\ADITHYA\Downloads\IEDC_Summit(new).csv
-- Total Records: 55
-- Empty fields are inserted as NULL
-- =========================================================================

-- 1. Ensure event_category and speakers columns exist on events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_category TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS speakers TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS date TEXT;

-- 2. Insert CSV records into events table using existing 'speakers' column
INSERT INTO events (
  room_number,
  room_name,
  room,
  event_name,
  building,
  floor,
  time_slot,
  date,
  event_category,
  speakers
)
VALUES
  (NULL, NULL, NULL, 'Check-in', NULL, NULL, '7:15 AM', '28-Sep-26', 'Formal Function', NULL),
  (NULL, NULL, NULL, 'Inaugural Session', 'Auditorium', NULL, '9:30 AM-10:30 AM', '28-Sep-26', 'Formal Function', NULL),
  (NULL, NULL, NULL, 'Robotics Experience Zone:Inker Robotics', NULL, NULL, '10:30:00 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'VR and AR Experience Zone: Jobin and Jismi', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Wheelchair Experience Zone ? NCAHT, IIT Madras', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Drone Experience Zone: Fuselage Innovations Private Limited', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Knowledge Sharing and Networking Activity: TinkerHub', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Mushroom Culture Activity: Adam ? Grow the Funguy', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Rocket Builders: Team Abhyuday ? CFI, IIT Madras', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Aerial Robotics:Project MICAS from Aeroclub ? CFI, IIT Madras', NULL, NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Activity hub', NULL),
  (NULL, NULL, NULL, 'Startup Exhibition', 'Deccenial Block', NULL, '10:30 AM-4:30 PM', '28-Sep-26', 'Startup exhibitions', NULL),
  (NULL, NULL, NULL, 'Startup Panel: From Campus Ideas to Real Businesses', 'SIIMS Auditorium', NULL, '10:45 AM-11:30 AM', '28-Sep-26', 'Panel Discussions and Fireside Chats', NULL),
  (NULL, 'AI Lab', 'AI Lab', 'Think It. Build It. Automate It ? Your First AI Agent with IBM Bob and watsonx Orchestrate', 'Main Block', '1', '11:00 AM 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Prometheus Startup Pitching Competition', 'Main Block', NULL, '11:00 AM 1:30 PM', '28-Sep-26', 'Startup exhibitions', NULL),
  (NULL, NULL, NULL, 'Bloq Quantum Hackathon 2026', 'Knowledge Center', NULL, '11:00 AM 1:00 PM', '28-Sep-26', 'Hackathons and Quiz', NULL),
  ('1212', 'Computer Lab 2', '1212 (Computer Lab 2)', 'AI in FinTech ? Transforming Finance With AI', 'Main Block', '2', '11:00 AM 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1211', 'Computer Center', '1211 (Computer Center)', 'Connect to Remote Agents with ADK and Agent2Agent (A2A) SDK', 'Main Block', '2', '11:00 AM 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Know Yourself, Build Better ? Entrepreneurship Development Workshop', 'Main Block', NULL, '11:00 AM 1:30 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('3004 - 3005', 'EEE Lab 4', '3004 - 3005 (EEE Lab 4)', 'Device-to-Device Communication: Keltron Knowledge Centre', 'Deccenial Block', 'Ground', '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1216', 'Classroom', '1216 (Classroom)', 'AICTE IP &  Innovation Clinic', 'Main Block', '2', '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2004', 'Classroom', '2004 (Classroom)', 'Laser Cutting Workshop: Fab Lab Kerala', 'Bio Block', 'Ground', '11:00 AM - 11:30 AM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2213', 'BSP Lab', '2213 (BSP Lab)', 'Product Modeling and Startup Program using SOLIDWORKS', 'Bio Block', '2', '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, 'AICTE IDEA Lab', 'AICTE IDEA Lab', 'Digital Fabrication: AICTE IDEA Lab', 'Deccenial Block', 'Ground', '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2001', 'Agappe Lab', '2001 (Agappe Lab)', 'Biosensor Fabrication Workshop', 'Bio Block', 'Ground', '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2010', 'CPS Lab', '2010 (CPS Lab)', 'Hands-On IoT with ESP32: GPIO Control and Sensor Interfacing', 'Bio Block', 'Ground', '11:00 AM - 12:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1114', 'Classroom', '1114 (Classroom)', 'Design Thinking and Validation', 'Main Block', '1', '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Aesthetics of Technology', NULL, NULL, '11:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1208', 'Classroom', '1208 (Classroom)', 'Founder Development ? Lightning Talk', 'Main Block', '2', '11:00 AM - 11:15 AM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1207', 'Classroom', '1207 (Classroom)', 'IITians Alumni Mentoring Clinic', 'Main Block', '2', '11:00 AM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Corporate Panel: What Corporates Expect from the Next Generation and Startups', 'Auditorium', NULL, '11:15 AM - 12:00 PM', '28-Sep-26', 'Panel Discussions and Fireside Chats', NULL),
  ('1208', 'Classroom', '1208 (Classroom)', 'Founder Development ? One-to-One Speed Mentoring', 'Main Block', '2', '11:15 AM - 12:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Alumni Panel: Kerala''s Homegrown Leaders', 'SIIMS Auditorium', NULL, '11:30 AM - 12:45 PM', '28-Sep-26', 'Panel Discussions and Fireside Chats', NULL),
  ('2004', 'Classroom', '2004 (Classroom)', 'Laser Cutting Workshop: Fab Lab Kerala', 'Bio Block', 'Ground', '11:45 AM - 12:15 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1105', 'Classroom', '1105 (Classroom)', 'Roadmap to Fully Funded Global Opportunities', 'Main Block', '1', '12:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, 'CPS Lab', 'CPS Lab', 'Hands-On IoT with ESP32: GPIO Control and Sensor Interfacing', 'Bio Block', 'Ground', '12:00 AM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Fireside Chat: Build What Industry Needs', 'SIIMS Auditorium', NULL, '12:15 AM - 1:00 PM', '28-Sep-26', 'Panel Discussions and Fireside Chats', NULL),
  ('2004', 'Classroom', '2004 (Classroom)', 'Laser Cutting Workshop: Fab Lab Kerala', 'Bio Block', 'Ground', '12:30 PM - 1:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Lunch Break', NULL, NULL, '1:00 PM - 2:00 PM', '28-Sep-26', 'Formal Function', NULL),
  (NULL, 'Library', 'Library', 'Ask Better. Think Better. Build Better ? The Human Edge in the AI Era', 'Knowledge Center', 'Ground', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Influencer Panel: Beyond Likes ? Turning Content into a Career', 'Main Block', NULL, '2:00 PM - 3:00 PM', '28-Sep-26', 'Panel Discussions and Fireside Chats', NULL),
  (NULL, NULL, NULL, 'ESAFQuizaMA 2026 ? Business Quiz', 'SIIMS Auditorium', NULL, '2:00 PM - 4:00 PM', '28-Sep-26', 'Hackathons and Quiz', NULL),
  ('1211', 'Computer Center', '1211 (Computer Center)', 'Agentic AI with Google ADK: From Zero to Build', 'Main Block', '2', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, 'Agappe Lab', 'Agappe Lab', 'Spin to Innovate: Hands-on Nanofiber Fabrication Workshop', 'Bio Block', 'Ground', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('3004 - 3005', 'EEE Lab 4', '3004 - 3005 (EEE Lab 4)', 'PCB Designing Workshop: Talking Machines ? Keltron Knowledge Centre', 'Deccenial Block', 'Ground', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2004', 'Classroom', '2004 (Classroom)', 'Laser Cutting Workshop: Fab Lab Kerala', 'Bio Block', 'Ground', '2:00 PM - 2:30 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('3306', 'CS Lab 3', '3306 (CS Lab 3)', 'From Simulation to Reality: ROS 2, Gazebo & Dobot Workshop', 'Deccenial Block', '3', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2205', 'GE Lab', '2205 (GE Lab)', 'Medical Device Designing, GE Center of Excellence, SCET', 'Bio Block', '2', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2003', 'Classroom', '2003 (Classroom)', 'Bio 3D Printing Workshop: Moopens', 'Bio Block', 'Ground', '2:00 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('1217', 'Classroom', '1217 (Classroom)', 'Startup Legal Roadmap: What Every Student Founder Should Know', 'Main Block', '2', '2:00 PM - 3:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2004', 'Classroom', '2004 (Classroom)', 'Laser Cutting Workshop: Fab Lab Kerala', 'Bio Block', 'Ground', '2:45 PM - 3:15 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  ('2004', 'Classroom', '2004 (Classroom)', 'Laser Cutting Workshop: Fab Lab Kerala', 'Bio Block', 'Ground', '3:30 PM - 4:00 PM', '28-Sep-26', 'Workshops and Clinics', NULL),
  (NULL, NULL, NULL, 'Student Unicorn Prize', 'Deccenial Block', NULL, '4:00 PM - 4:30 PM', '28-Sep-26', 'Startup exhibitions', NULL),
  (NULL, NULL, NULL, 'Valedictory Session', 'Auditorium', NULL, '4:30 PM- 5:00 PM', '28-Sep-26', 'Formal Function', NULL),
  (NULL, NULL, NULL, 'Refreshment Break', NULL, NULL, '4:30 PM-6:00 PM', '28-Sep-26', 'Formal Function', NULL),
  (NULL, NULL, NULL, 'Pro Show', 'Auditorium', NULL, '6:00 PM', NULL, 'Proshow', NULL);
