-- ============================================================
-- STEP 1: Drop & recreate the events table with EXACT 11 columns
-- ============================================================
DROP TABLE IF EXISTS events CASCADE;

CREATE TABLE events (
  id             BIGSERIAL PRIMARY KEY,
  event_name     TEXT,
  building       TEXT,
  floor          TEXT,
  room           TEXT,
  event_date     DATE,
  time_start     TEXT,
  time_end       TEXT,
  speakers       TEXT,
  event_category TEXT,
  time_slot      TEXT
);

-- ============================================================
-- STEP 2: Enable RLS + allow public read (anon key can SELECT)
-- No INSERT / UPDATE / DELETE allowed from the frontend.
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read events"
  ON events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- STEP 2: Insert all 62 rows from CSV
-- ============================================================
INSERT INTO events (event_name, building, floor, room, event_date, time_start, time_end, speakers, event_category, time_slot) VALUES  ('Inaugural Session', 'Auditorium', '', '', '2026-09-28', '11:30', '12:30', 'Shri P. K. Kunhalikutty; Shri Seeram Sambasiva Rao, IAS; Shri Anoop Ambika; Saneesh Kumar; Bishop Mar Pauly Kanookadan; Rev. Fr. Dr. Anto Chungath; Dr. Leon Ittiachen; Ramkumar Sreedharan Nair; Ms Madhuri D. Madhavanpillai; Shyamnath Harinath; Shri Jibin Jose', 'Inaugural Session', '11:30 AM - 12:30 PM'),
  ('Valedictory Session', 'Auditorium', '', '', '2026-09-28', '16:30', '17:30', 'Rev. Fr. Dr. Anto Chungath; Dr. Leon Ittiachen; Ramkumar Sreedharan Nair; Dr. Saji Gopinath; Smt. Shikha Surendran IAS; Dr. Biju K; Malavika Chandran', 'Valedictory Session', '04:30 PM - 05:30 PM'),
  ('Industry Connect-Accoutable AI in Healthcare', 'Auditorium', '', '', '2026-09-28', '09:30', '10:15', 'Deepak Menon K; Shri Aseem Sahu; Dr. Kurian Alappatt; Dr. Jis Paul; Shyamnath Harinath', 'Panel Discussion', '09:30 AM - 10:15 AM'),
  ('Corporate Panel: What Corporates Expect from the Next Generation and Startups', 'Auditorium', '', '', '2026-09-28', '10:15', '11:00', 'Robin Tomy; Pavan Kumar Reddy; Madhuri; Bergin Russel', 'Panel Discussion', '10:15 AM - 11:00 AM'),
  ('ESAFQuizaTMA 2026 — Business Quiz', 'Auditorium', '', '', '2026-09-28', '10:15', '11:00', 'Mr. AR Ranjith', 'Competition', '10:15 AM - 11:00 AM'),
  ('From Campus Ideas to Real Businesses', 'SIMS Bishop James Pazhayattil Auditorium', '', '', '2026-09-28', '09:45', '10:30', 'Devika Chandrasekharan; Christo Varghese; Deepu Xavier; Dr. Vrinda V Nair', 'Panel Discussion', '09:45 AM - 10:30 AM'),
  ('Kerala''s Homegrown Leaders', 'SIMS Bishop James Pazhayattil Auditorium', '', '', '2026-09-28', '10:30', '11:15', 'Aswin KR; Anu Joseph Palathingal; Jismi Jobin; Er. Najeeb Bin Haneef; Mr. Ajay Basil', 'Panel Discussion', '10:30 AM - 11:15 AM'),
  ('Influencer Meetup: Turning Content into a Career', 'SIMS Bishop James Pazhayattil Auditorium', '', '', '2026-09-28', '14:00', '15:00', 'Veena Mukundan; Aflu P; Mia Joseph Chirakkekaran', 'Fireside Chat', '02:00 PM - 03:00 PM'),
  ('Fireside Chat: Build What Industry Needs', 'SIMS Bishop James Pazhayattil Auditorium', '', '', '2026-09-28', '15:00', '16:00', 'Dr. Saji Gopinath; Mr. Anoop Ambika', 'Fireside Chat', '03:00 PM - 04:00 PM'),
  ('Product Modeling and Startup Program using SOLIDWORKS', 'Bio Block', '', '2213 (BSP LAB)', '2026-09-28', '09:30', '11:30', 'Shanoob Kiliyamannil', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Biosensor Fabrication Workshop', 'Bio Block', '', 'AGAPPE LAB', '2026-09-28', '09:30', '11:30', 'Pooja Das Manjulabhai', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Bloq Quantum Hackathon 2026', 'Bio Block', '', '2113 (EC Seminar Hall)', '2026-09-28', '09:30', '11:30', 'Abin; Abhin Letha; Udayakumar', 'Hackathon', '09:30 AM - 11:30 AM'),
  ('Laser Cutting Workshop', 'Bio Block', '', '2004 (EC Classroom)', '2026-09-28', '09:30', '16:00', 'Fab Lab Kerala', 'Workshop', '09:30 AM - 04:00 PM'),
  ('From Idea to Product in 90 Minutes – The AI-Powered Product Engineering Journey', 'Bio Block', '', '2010 (CPS LAB)', '2026-09-28', '14:00', '15:30', 'Deepu Xavier; Mehar Rahim', 'Workshop', '02:00 PM - 03:30 PM'),
  ('Medical device Designing', 'Bio Block', '', '2205 (GE LAB)', '2026-09-28', '14:00', '16:00', 'Akhil Davis; Bennyson', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Spin to innovate : Hands-on Nanofiber Fabrication Workshop', 'Bio Block', '', 'AGAPPE LAB', '2026-09-28', '14:00', '16:00', 'Mayasree O', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Drone Experience Zone: Fuselage Innovations Private Limited', 'Bio Block', '', 'Bio Block Entrance', '2026-09-28', '09:30', '16:30', 'Fuselage Innovations Private Limited; Anilu Anil; Aaron Bejy Mathew', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Rocket Builders: Team Abhyuday — CFI, IIT Madras', 'Bio Block', '', 'Near Lift Ground Floor', '2026-09-28', '09:30', '16:30', 'Team Abhyuday CFI, IIT Madras; K. Sai Pravallika; Sparsh Bandi', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Knowledge Sharing and Networking', 'Bio Block', '', '2002 (Classroom) & Open Area Beside Chemical Engineering Lab', '2026-09-28', '09:30', '16:30', 'Tinkerhub', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Start-Up Pitching', 'Knowledge Center', '', 'Library', '2026-09-28', '11:30', '13:30', 'Prometheus', 'Pitching', '11:30 AM - 01:30 PM'),
  ('Ask Better. Think Better. Build Better — The Human Edge in the AI Era,IBM', 'Knowledge Center', '', 'Library', '2026-09-28', '14:00', '16:00', 'Roshini Varma; Sujeesh Joy; Edwin Jacob Baby', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Colour at Machine Speed', 'Knowledge Center', '', '4202 (Multimedia hall)', '2026-09-28', '09:30', '10:00', 'Robin Tomy', 'Invited Talk', '09:30 AM - 10:00 AM'),
  ('Life in the Age of AI: What Changes, What Matters', 'Knowledge Center', '', '4202 (Multimedia hall)', '2026-09-28', '10:00', '10:30', 'Sudheesh Kairali', 'Key Note', '10:00 AM - 10:30 AM'),
  ('You’re Never Too Young to Build', 'Knowledge Center', '', '4202 (Multimedia hall)', '2026-09-28', '10:30', '11:00', 'Eisa Usman', 'Invited Talk', '10:30 AM - 11:00 AM'),
  ('Emerging Technologies and the Changing World Order', 'Knowledge Center', '', '4202 (Multimedia hall)', '2026-09-28', '11:30', '12:00', 'Roshan Kynadi', 'Invited Talk', '11:30 AM - 12:00 PM'),
  ('Wheelchair Experience Zone — NCAHT, IIT Madras', 'Knowledge Center', '', 'Ground Floor Entrance Near the Ramp', '2026-09-28', '09:30', '16:30', 'NCAHT, IIT Madras; Nishan S Nizar; Dheeraj K Panicker; Prajith Raj R', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Bustler Skill Hub', 'Knowledge Center', '', 'Left Side of Knowledge Center (In front of Ramp)', '2026-09-28', '09:30', '16:30', '', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Hands-On IoT with ESP32: GPIO Control and Sensor Interfacing', 'Decennial Block', '', '3306 (Computer Lab 2)', '2026-09-28', '09:30', '10:30', 'Jobin & Jismi; Anson A Akkara; Joseph T Thaliyan; Majo Davis; Manu Joseph', 'Workshop', '09:30 AM - 10:30 AM'),
  ('Hands-On IoT with ESP32: GPIO Control and Sensor Interfacing', 'Decennial Block', '', '3306 (Computer Lab 2)', '2026-09-28', '10:45', '11:45', 'Jobin & Jismi; Anson A Akkara; Joseph T Thaliyan; Majo Davis; Manu Joseph', 'Workshop', '10:45 AM - 11:45 AM'),
  ('Device-to-Device Communication', 'Decennial Block', '', '3005 (EEE LAB 4)', '2026-09-28', '09:30', '11:30', 'Keltron Knowledge Centre; Febin C S; Amarnath Madhu', 'Workshop', '09:30 AM - 11:30 AM'),
  ('PCB Designing Workshop', 'Decennial Block', '', '3005 (EEE LAB 4)', '2026-09-28', '14:00', '16:00', 'Keltron Knowledge Centre; Febin C S; Amarnath Madhu', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Digital fabrication', 'Decennial Block', '', 'AICTE IDEA LAB', '2026-09-28', '09:30', '11:30', 'AICTE IDEA Lab; Paul Sadric', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Cybersecurity Innovations by EY', 'Decennial Block', '', '3306 (Computer Lab 3)', '2026-09-28', '09:30', '13:30', 'EY; Anish Kumar T; Anton S Manjaly; Abhinesh Kamal K U; Janith J', 'Workshop', '09:30 AM - 01:30 PM'),
  ('From Simulation to Reality: ROS 2, Gazebo & Dobot Workshop', 'Decennial Block', '', '3306 (Computer Lab 3)', '2026-09-28', '14:00', '16:00', 'Aisha Nasrin TN', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Start-Up Expo', 'Decennial Block', '', 'Quadrangle', '2026-09-28', '09:30', '16:00', 'Dr. Viji Kala; Meera; Steffi Felix', 'Expo', '09:30 AM - 04:00 PM'),
  ('Mushroom Culture Activity: Adam — Grow the Funguy', 'Decennial Block', '', 'Quandrangle', '2026-09-28', '09:30', '16:30', 'Grow the Funguy; Nadirshah O H; Aman Shahid Thahana', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('IITians Mentoring Clinic ( IIT PALS )', 'Main Block', '', '1207 (Classroom)', '2026-09-28', '09:30', '16:00', 'Vijayalakshmi Sankar; Dr. K Ajith Kumar; Parthasarathy K; Srinivasan K Kidambi', 'Clinic', '09:30 AM - 04:00 PM'),
  ('Founder Development - Lightning Talk & One-to-One Speed Mentoring', 'Main Block', '', '1208 (Classroom)', '2026-09-28', '09:30', '16:00', 'Jimmy James', 'Clinic', '09:30 AM - 04:00 PM'),
  ('AICTE IP & Innovation Clinic', 'Main Block', '', '1216 (Classroom)', '2026-09-28', '10:00', '13:00', 'Ms. Indu Govind', 'Clinic', '10:00 AM - 01:00 PM'),
  ('Startup Legal Roadmap: What Every Student Founder Should Know', 'Main Block', '', '1217 (Classroom)', '2026-09-28', '10:00', '13:00', 'Sheethal CS', 'Workshop', '10:00 AM - 01:00 PM'),
  ('AI in Fintech', 'Main Block', '', '1212 (Computer Lab 2)', '2026-09-28', '09:30', '11:30', 'Feba Abraham', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Cyber Security: Learn Explore & Defend', 'Main Block', '', '1212 (Computer Lab 2)', '2026-09-28', '14:00', '16:00', 'Mohammed Fizal; Noorul Ameen', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Connect to Remote Agents with ADK and Agent2Agent (A2A) SDK', 'Main Block', '', '1211 (Computer Center)', '2026-09-28', '11:00', '13:00', 'Ajoe Joseph', 'Workshop', '11:00 AM - 01:00 PM'),
  ('Agentic AI with Google ADK : From Zero to Build', 'Main Block', '', '1211 (Computer Center)', '2026-09-28', '14:00', '16:00', 'Jay Thakkar', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Aesthetics of Technology', 'Main Block', '', '1101 (Classroom)', '2026-09-28', '09:30', '11:30', 'Akshay', 'Workshop', '09:30 AM - 11:30 AM'),
  ('How to Build a Mature Product', 'Main Block', '', '1101 (Classroom)', '2026-09-28', '14:00', '16:00', 'Dinoj Joseph', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Know yourself. Build better : Entrepreneurship Development Workshop', 'Main Block', '', '1104 (Classroom)', '2026-09-28', '09:30', '12:00', 'Amar Rajan', 'Workshop', '09:30 AM - 12:00 PM'),
  ('Roadmap to Fully Funded Global Opportunities', 'Main Block', '', '1105 (Classroom)', '2026-09-28', '10:00', '11:00', 'Nasif NM', 'Workshop', '10:00 AM - 11:00 AM'),
  ('Design Thinking and Validation', 'Main Block', '', '1114 (Classroom)', '2026-09-28', '09:30', '11:30', 'Mr. Gopakumar Vishwananthan', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Hack. build. network. get hired: Turn Hackathons to Career', 'Main Block', '', '1114 (Classroom)', '2026-09-28', '14:00', '16:00', 'Sajad Hussain', 'Workshop', '02:00 PM - 04:00 PM'),
  ('Think It. Build It. Automate It — Your First AI Agent with IBM Bob and watsonx Orchestrate (IBM)', 'Main Block', '', 'AI LAB', '2026-09-28', '09:30', '11:30', 'Cibin Thomas Jacob; Josmi Jomon; Adhil Salim; Benjamin G Nechicattu; Sudheesh A R', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Think It. Build It. Automate It — Your First AI Agent with IBM Bob and watsonx Orchestrate (IBM)', 'Main Block', '', 'AI LAB and if needed will extend to Computer Lab 1', '2026-09-28', '09:30', '11:30', 'Cibin Thomas Jacob; Josmi Jomon; Adhil Salim; Benjamin G Nechicattu; Sudheesh A R', 'Workshop', '09:30 AM - 11:30 AM'),
  ('Robo Interaction Zone: Unique World Robotics', 'Main Block', '', 'Main Block Front Left Side', '2026-09-28', '09:30', '16:30', 'Unique World Robotics', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Aerial Robotics: Project MICAS from Aeroclub — CFI, IIT Madras', 'Main Block', '', 'Lawn between Main block and Auditorium', '2026-09-28', '09:30', '16:30', 'Project MICAS from Aeroclub — CFI, IIT Madras; Akhand Veer Garg; Mohamed Zakaria', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Robotics Experience Zone: Inker Robotics', 'SIMS College', '', 'SIMS College Entrance', '2026-09-28', '09:30', '16:30', 'Inker Robotics', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('VR and AR Experience Zone: Jobin and Jismi', 'Main Block', '', 'Main Block Lobby infront of Jasmine Hall', '2026-09-28', '09:30', '16:30', 'Jobin and Jismi', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Future Flight Zone: Drone Imaginations', 'Main Block', '', 'Main Block Lobby infront of Confrence Room', '2026-09-28', '09:30', '16:30', 'Ishel Mehak; Muhammad Shameem P; Abin Sudheer', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Aero Innovation Zone: SPINX', 'Main Block', '', 'Right Side of Main Block, Parking Space of Executive director’s Car', '2026-09-28', '09:30', '16:30', 'SpinX', 'Activity Hub', '09:30 AM - 04:30 PM'),
  ('Arise Keralam: Growing Beyond Boundaries', 'Jasmine Hall', '', 'Jasmine Hall', '2026-09-28', '10:00', '11:00', 'Mr. Jackson David; Mr. Paul Thomas; Mr. Seejo Ponnore; Mr. Christo George; Dr. Yadu Narayana Mooss', 'Panel Discussion', '10:00 AM - 11:00 AM'),
  ('From Kerala to the World: An Investor Perspective', 'Jasmine Hall', '', 'Jasmine Hall', '2026-09-28', '14:00', '15:00', 'Mr. Ravi Kumar; Mr. Joe; Mr. Shiraj Jacob; Mr. Hari Krishnan', 'Panel Discussion', '02:00 PM - 03:00 PM'),
  ('Coporate Start-Up Closed Door Discussion', 'Main Block', '', '1007 (HR Room)', '2026-09-28', '09:30', '16:00', '', 'Discussion', '09:30 AM - 04:00 PM'),
  ('Proshow', 'Ground', '', 'Ground', '2026-09-28', '18:00', NULL, '', 'Proshow', '06:00 PM onwards');
