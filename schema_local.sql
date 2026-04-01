--
-- PostgreSQL database dump
--

\restrict nWko59V66ESI0edDzJm2TDybHsHfYqs6FZPSJyQOvpnZbueGO12VvRnXgHYCL8m

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.assignment_status AS ENUM (
    'ACTIVE',
    'CLOSED'
);


ALTER TYPE public.assignment_status OWNER TO postgres;

--
-- Name: document_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_category AS ENUM (
    'COMPANY',
    'PERSONAL'
);


ALTER TYPE public.document_category OWNER TO postgres;

--
-- Name: document_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'ARCHIVED'
);


ALTER TYPE public.document_status OWNER TO postgres;

--
-- Name: document_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_type AS ENUM (
    'CONTRACT',
    'PAYSLIP',
    'ID_CARD',
    'DRIVER_LICENSE',
    'MEDICAL_CERTIFICATE',
    'OTHER'
);


ALTER TYPE public.document_type OWNER TO postgres;

--
-- Name: leave_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.leave_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.leave_status OWNER TO postgres;

--
-- Name: vehicle_issue_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vehicle_issue_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'SCHEDULED'
);


ALTER TYPE public.vehicle_issue_status OWNER TO postgres;

--
-- Name: vehicle_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vehicle_status AS ENUM (
    'ACTIVE',
    'IN_SERVICE',
    'INACTIVE',
    'SOLD'
);


ALTER TYPE public.vehicle_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    user_id integer NOT NULL,
    uploaded_by integer,
    type public.document_type NOT NULL,
    category public.document_category NOT NULL,
    status public.document_status NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: employee_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(30),
    address character varying(255),
    "position" character varying(100),
    department character varying(100),
    hire_date date,
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    iban character varying(64)
);


ALTER TABLE public.employee_profiles OWNER TO postgres;

--
-- Name: employee_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_profiles_id_seq OWNER TO postgres;

--
-- Name: employee_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_profiles_id_seq OWNED BY public.employee_profiles.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status public.leave_status DEFAULT 'pending'::public.leave_status NOT NULL,
    reviewed_by_admin_id integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_requests_id_seq OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    unique_code character varying(50) NOT NULL,
    shift_number character varying(20),
    pin_hash character varying(255),
    password_hash character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    username character varying(50),
    role character varying(20) DEFAULT 'employee'::character varying NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicle_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_assignments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    vehicle_id integer NOT NULL,
    status public.assignment_status NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone
);


ALTER TABLE public.vehicle_assignments OWNER TO postgres;

--
-- Name: vehicle_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicle_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicle_assignments_id_seq OWNER TO postgres;

--
-- Name: vehicle_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicle_assignments_id_seq OWNED BY public.vehicle_assignments.id;


--
-- Name: vehicle_handover_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_handover_reports (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    mileage_start integer,
    mileage_end integer,
    dashboard_warnings_start text,
    dashboard_warnings_end text,
    damage_notes_start text,
    damage_notes_end text,
    notes_start text,
    notes_end text,
    has_documents boolean NOT NULL,
    has_medkit boolean NOT NULL,
    has_extinguisher boolean NOT NULL,
    has_warning_triangle boolean NOT NULL,
    has_spare_wheel boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicle_handover_reports OWNER TO postgres;

--
-- Name: vehicle_handover_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicle_handover_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicle_handover_reports_id_seq OWNER TO postgres;

--
-- Name: vehicle_handover_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicle_handover_reports_id_seq OWNED BY public.vehicle_handover_reports.id;


--
-- Name: vehicle_issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_issues (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    assignment_id integer,
    reported_by_user_id integer NOT NULL,
    need_service_in_km integer,
    need_brakes boolean NOT NULL,
    need_tires boolean NOT NULL,
    need_oil boolean NOT NULL,
    dashboard_checks text,
    other_problems text,
    status public.vehicle_issue_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_mechanic_id integer,
    scheduled_for timestamp with time zone,
    scheduled_location character varying(255)
);


ALTER TABLE public.vehicle_issues OWNER TO postgres;

--
-- Name: vehicle_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicle_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicle_issues_id_seq OWNER TO postgres;

--
-- Name: vehicle_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicle_issues_id_seq OWNED BY public.vehicle_issues.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    brand character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    license_plate character varying(20) NOT NULL,
    year integer NOT NULL,
    vin character varying(50),
    status public.vehicle_status NOT NULL,
    current_mileage integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicles_id_seq OWNER TO postgres;

--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: employee_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles ALTER COLUMN id SET DEFAULT nextval('public.employee_profiles_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicle_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_assignments ALTER COLUMN id SET DEFAULT nextval('public.vehicle_assignments_id_seq'::regclass);


--
-- Name: vehicle_handover_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_handover_reports ALTER COLUMN id SET DEFAULT nextval('public.vehicle_handover_reports_id_seq'::regclass);


--
-- Name: vehicle_issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_issues ALTER COLUMN id SET DEFAULT nextval('public.vehicle_issues_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employee_profiles employee_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_assignments vehicle_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_assignments
    ADD CONSTRAINT vehicle_assignments_pkey PRIMARY KEY (id);


--
-- Name: vehicle_handover_reports vehicle_handover_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_handover_reports
    ADD CONSTRAINT vehicle_handover_reports_pkey PRIMARY KEY (id);


--
-- Name: vehicle_issues vehicle_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_issues
    ADD CONSTRAINT vehicle_issues_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_license_plate_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_license_plate_key UNIQUE (license_plate);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_vin_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vin_key UNIQUE (vin);


--
-- Name: ix_documents_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_id ON public.documents USING btree (id);


--
-- Name: ix_documents_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_documents_user_id ON public.documents USING btree (user_id);


--
-- Name: ix_employee_profiles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_profiles_id ON public.employee_profiles USING btree (id);


--
-- Name: ix_employee_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_employee_profiles_user_id ON public.employee_profiles USING btree (user_id);


--
-- Name: ix_leave_requests_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_leave_requests_id ON public.leave_requests USING btree (id);


--
-- Name: ix_leave_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_leave_requests_user_id ON public.leave_requests USING btree (user_id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_unique_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_unique_code ON public.users USING btree (unique_code);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_vehicle_assignments_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_assignments_id ON public.vehicle_assignments USING btree (id);


--
-- Name: ix_vehicle_assignments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_assignments_user_id ON public.vehicle_assignments USING btree (user_id);


--
-- Name: ix_vehicle_assignments_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_assignments_vehicle_id ON public.vehicle_assignments USING btree (vehicle_id);


--
-- Name: ix_vehicle_handover_reports_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_vehicle_handover_reports_assignment_id ON public.vehicle_handover_reports USING btree (assignment_id);


--
-- Name: ix_vehicle_handover_reports_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_handover_reports_id ON public.vehicle_handover_reports USING btree (id);


--
-- Name: ix_vehicle_issues_assigned_mechanic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_issues_assigned_mechanic_id ON public.vehicle_issues USING btree (assigned_mechanic_id);


--
-- Name: ix_vehicle_issues_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_issues_assignment_id ON public.vehicle_issues USING btree (assignment_id);


--
-- Name: ix_vehicle_issues_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_issues_id ON public.vehicle_issues USING btree (id);


--
-- Name: ix_vehicle_issues_reported_by_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_issues_reported_by_user_id ON public.vehicle_issues USING btree (reported_by_user_id);


--
-- Name: ix_vehicle_issues_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicle_issues_vehicle_id ON public.vehicle_issues USING btree (vehicle_id);


--
-- Name: ix_vehicles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_vehicles_id ON public.vehicles USING btree (id);


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: employee_profiles employee_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vehicle_issues fk_vehicle_issues_assigned_mechanic; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_issues
    ADD CONSTRAINT fk_vehicle_issues_assigned_mechanic FOREIGN KEY (assigned_mechanic_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_reviewed_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_reviewed_by_admin_id_fkey FOREIGN KEY (reviewed_by_admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vehicle_assignments vehicle_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_assignments
    ADD CONSTRAINT vehicle_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: vehicle_assignments vehicle_assignments_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_assignments
    ADD CONSTRAINT vehicle_assignments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: vehicle_handover_reports vehicle_handover_reports_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_handover_reports
    ADD CONSTRAINT vehicle_handover_reports_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE CASCADE;


--
-- Name: vehicle_issues vehicle_issues_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_issues
    ADD CONSTRAINT vehicle_issues_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE SET NULL;


--
-- Name: vehicle_issues vehicle_issues_reported_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_issues
    ADD CONSTRAINT vehicle_issues_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: vehicle_issues vehicle_issues_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_issues
    ADD CONSTRAINT vehicle_issues_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict nWko59V66ESI0edDzJm2TDybHsHfYqs6FZPSJyQOvpnZbueGO12VvRnXgHYCL8m

