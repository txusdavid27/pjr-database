import {
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import {
    Activity,
    AlertCircle,
    Banknote,
    Calendar,
    ChevronDown,
    Clock,
    CreditCard,
    FileText,
    Phone,
    Shirt,
    Target,
    Trophy,
    User,
    Zap
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { columns, Player } from "./columns"

// Helper for stats bars
const StatBar = ({ label, value, max = 100, color = "bg-blue-500" }: { label: string, value: number, max?: number, color?: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">{label}</span>
            <span className="font-bold">{value}</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
        </div>
    </div>
)

// Helper for info items
const InfoItem = ({ icon: Icon, label, value, className = "" }: { icon: any, label: string, value: string | number, className?: string }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
        <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-sm">{value || "-"}</p>
        </div>
    </div>
)

const parseBalance = (val: string | number): number => {
    if (typeof val === 'string') return parseFloat(val)
    return val
}



export default function App() {
    const [data, setData] = React.useState<Player[]>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    // Modal State
    const [selectedPlayer, setSelectedPlayer] = React.useState<Player | null>(null)
    const [isModalOpen, setIsModalOpen] = React.useState(false)

    // Fetch Data
    React.useEffect(() => {
        fetch("/api/players")
            .then((res) => res.json())
            .then((data) => setData(data))
            .catch((err) => console.error("Failed to fetch players:", err))
    }, [])

    const handleViewDetails = (player: Player) => {
        setSelectedPlayer(player)
        setIsModalOpen(true)
    }

    const table = useReactTable({
        data,
        columns: columns(handleViewDetails),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    const selectedTotal = table.getFilteredSelectedRowModel().rows.reduce((sum, row) => {
        return sum + parseBalance(row.original.balance)
    }, 0)

    return (
        <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Player Management
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border">
                        <span className="text-sm font-medium text-muted-foreground">Selected Total:</span>
                        <span className={`text-lg font-bold ${selectedTotal < 0 ? "text-red-600" : "text-green-600"}`}>
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selectedTotal)}
                        </span>
                    </div>

                </div>
            </div>

            <div className="flex items-center py-4 gap-2">
                <Input
                    placeholder="Filter names..."
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns(handleViewDetails).length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Player Details Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                    {selectedPlayer && (
                        <div className="flex flex-col">
                            {/* Header Section */}
                            <div className="relative h-48 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Trophy className="h-64 w-64 transform rotate-12 translate-x-12 -translate-y-12" />
                                </div>
                                <div className="relative z-10 flex items-end gap-6 h-full">
                                    <img
                                        src={selectedPlayer.photo}
                                        alt={selectedPlayer.name}
                                        className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg bg-slate-700"
                                    />
                                    <div className="mb-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/10">
                                                #{selectedPlayer.numero}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedPlayer.activo === 'Y' ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
                                                {selectedPlayer.activo === 'Y' ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-bold">{selectedPlayer.name}</h2>
                                        <p className="text-slate-300 font-medium flex items-center gap-2">
                                            {selectedPlayer.apodo && `"${selectedPlayer.apodo}"`} • {selectedPlayer.posicion}
                                        </p>
                                    </div>
                                    <div className="ml-auto mb-2 text-right hidden sm:block">
                                        <p className="text-sm text-slate-400">Balance</p>
                                        <p className={`text-3xl font-bold ${parseBalance(selectedPlayer.balance) < 0 ? "text-red-400" : "text-green-400"}`}>
                                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseBalance(selectedPlayer.balance))}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-8 bg-slate-50/50 dark:bg-slate-950/50">
                                {/* Financial Overview (Mobile Only) */}
                                <div className="sm:hidden bg-white p-4 rounded-xl border shadow-sm">
                                    <p className="text-sm text-muted-foreground text-center">Current Balance</p>
                                    <p className={`text-3xl font-bold text-center ${parseBalance(selectedPlayer.balance) < 0 ? "text-red-600" : "text-green-600"}`}>
                                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseBalance(selectedPlayer.balance))}
                                    </p>
                                </div>

                                {/* Main Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Left Column: Stats & Attributes */}
                                    <div className="space-y-6 md:col-span-2">
                                        {/* Game Stats */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                                            <h3 className="font-semibold flex items-center gap-2 mb-4 text-lg">
                                                <Activity className="h-5 w-5 text-primary" />
                                                Performance Stats
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-slate-700">{selectedPlayer.goles}</div>
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Goals</div>
                                                </div>
                                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-slate-700">{selectedPlayer.asistencias}</div>
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Assists</div>
                                                </div>
                                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-slate-700">{selectedPlayer.atajadas}</div>
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Saves</div>
                                                </div>
                                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-slate-700">{selectedPlayer.disputados}</div>
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Matches</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 mt-4">
                                                <div className="flex flex-col items-center p-2 bg-yellow-50 rounded border border-yellow-100">
                                                    <div className="flex items-center gap-1 text-yellow-700 font-bold">
                                                        <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                                                        {selectedPlayer.amarillas}
                                                    </div>
                                                    <span className="text-[10px] text-yellow-600/80">Yellow Cards</span>
                                                </div>
                                                <div className="flex flex-col items-center p-2 bg-red-50 rounded border border-red-100">
                                                    <div className="flex items-center gap-1 text-red-700 font-bold">
                                                        <div className="w-3 h-4 bg-red-500 rounded-sm" />
                                                        {selectedPlayer.rojas}
                                                    </div>
                                                    <span className="text-[10px] text-red-600/80">Red Cards</span>
                                                </div>
                                                <div className="flex flex-col items-center p-2 bg-blue-50 rounded border border-blue-100">
                                                    <div className="flex items-center gap-1 text-blue-700 font-bold">
                                                        <Trophy className="h-3 w-3" />
                                                        {selectedPlayer.bonos}
                                                    </div>
                                                    <span className="text-[10px] text-blue-600/80">Bonuses</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attributes */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                                            <h3 className="font-semibold flex items-center gap-2 mb-4 text-lg">
                                                <Zap className="h-5 w-5 text-primary" />
                                                Attributes
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                <StatBar label="Speed" value={selectedPlayer.velocidad} color="bg-cyan-500" />
                                                <StatBar label="Stamina" value={selectedPlayer.resistencia} color="bg-green-500" />
                                                <StatBar label="Strength" value={selectedPlayer.fuerza} color="bg-red-500" />
                                                <StatBar label="Shooting" value={selectedPlayer.tiro} color="bg-orange-500" />
                                                <StatBar label="Passing" value={selectedPlayer.pase} color="bg-indigo-500" />
                                                <StatBar label="Defense" value={selectedPlayer.defenza} color="bg-slate-600" />
                                                <StatBar label="Attack" value={selectedPlayer.ataque} color="bg-rose-500" />
                                                <StatBar label="Header" value={selectedPlayer.cabeza} color="bg-purple-500" />
                                            </div>
                                        </div>

                                        {/* Traits */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                                            <h3 className="font-semibold flex items-center gap-2 mb-4 text-lg">
                                                <Target className="h-5 w-5 text-primary" />
                                                Traits & Analysis
                                            </h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-xs font-bold text-muted-foreground uppercase">Strengths</span>
                                                    <p className="text-sm mt-1">{selectedPlayer.fortalezas || "N/A"}</p>
                                                </div>
                                                <div className="h-px bg-border" />
                                                <div>
                                                    <span className="text-xs font-bold text-muted-foreground uppercase">Weaknesses</span>
                                                    <p className="text-sm mt-1">{selectedPlayer.debilidades || "N/A"}</p>
                                                </div>
                                                <div className="h-px bg-border" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase">Character</span>
                                                        <p className="text-sm mt-1">{selectedPlayer.caracter || "N/A"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase">Injuries</span>
                                                        <p className="text-sm mt-1 text-red-500">{selectedPlayer.lesiones || "None"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Personal & Financial */}
                                    <div className="space-y-6">
                                        {/* Personal Info */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-lg">
                                                <User className="h-5 w-5 text-primary" />
                                                Personal Info
                                            </h3>
                                            <InfoItem icon={Calendar} label="Date of Birth" value={selectedPlayer.nacimiento} />
                                            <InfoItem icon={Clock} label="Age" value={`${selectedPlayer.edad} years`} />
                                            <InfoItem icon={FileText} label="Document ID" value={selectedPlayer.documento} />
                                            <InfoItem icon={Phone} label="Contact" value={selectedPlayer.contacto_propio} />
                                            <InfoItem icon={AlertCircle} label="Emergency Contact" value={selectedPlayer.contacto_emergencia} />
                                        </div>

                                        {/* Financial Details */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-lg">
                                                <CreditCard className="h-5 w-5 text-primary" />
                                                Financials
                                            </h3>
                                            <InfoItem
                                                icon={Banknote}
                                                label="Total Contribution"
                                                value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selectedPlayer.aporte_total)}
                                                className="border-green-100 bg-green-50/50"
                                            />
                                            <div className="h-px bg-border my-2" />
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase mt-5 mb-2">Debts Breakdown</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Matches</span>
                                                    <span className="text-red-500 font-medium">${selectedPlayer.deuda_partidos}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Cards</span>
                                                    <span className="text-red-500 font-medium">${selectedPlayer.deuda_tarjetas}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Uniforms</span>
                                                    <span className="text-red-500 font-medium">${selectedPlayer.deuda_uniformes}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Registration</span>
                                                    <span className="text-red-500 font-medium">${selectedPlayer.deuda_inscripcion}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Trainings</span>
                                                    <span className="text-red-500 font-medium">${selectedPlayer.entrenamientos}</span>
                                                </div>
                                                <div className="h-px bg-border my-1" />
                                                <div className="flex justify-between font-bold">
                                                    <span>Total Debt</span>
                                                    <span className="text-red-600">${selectedPlayer.deuda_total}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Roles & Position */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                                            <h3 className="font-semibold flex items-center gap-2 mb-4 text-lg">
                                                <Shirt className="h-5 w-5 text-primary" />
                                                Roles & Position
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium border">
                                                    {selectedPlayer.posicion}
                                                </span>
                                                {selectedPlayer.posicion_secundaria && (
                                                    <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-sm font-medium border border-dashed">
                                                        {selectedPlayer.posicion_secundaria}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedPlayer.roles && (
                                                <div className="mt-4">
                                                    <p className="text-xs text-muted-foreground mb-2">ROLES</p>
                                                    <p className="text-sm">{selectedPlayer.roles}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
